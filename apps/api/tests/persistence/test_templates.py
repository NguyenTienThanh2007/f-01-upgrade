"""Template-seeded builds with controlled sandbox evidence; Docker is not run here."""
import asyncio
import hashlib
import json
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from f01.application import execution as service
from f01.application.projects import record_change, workspace
from f01.application.templates import get_template
from f01.config import Settings
from f01.db.models import BuildEvent, BuildRun, ExecutionJob, IdempotencyKey, SourceCandidate
from f01.db.session import Database
from f01.domain.errors import ApplicationError
from f01.domain.execution import CommandEvidence, StartBuild
from f01.domain.planning import ProjectPlan
from f01.domain.projects import RecordChange
from f01.domain.source import SourceArtifact
from f01.execution.sandbox import CommandPhase
from f01.execution.worker import BuildWorker
from tests.persistence.test_phase2b import ControlledSandbox, SourceProvider, configured, review_plan, setup_build

__all__ = ["configured"]


class FirstTypecheckFails(ControlledSandbox):
    def __init__(self) -> None:
        super().__init__();self.typechecks = 0

    async def command(self, name: str, phase: CommandPhase, tests: tuple[str, ...], alive: object) -> CommandEvidence:
        if phase == CommandPhase.TYPECHECK:
            self.typechecks += 1
            return self.result("typecheck", self.typechecks == 1)
        return self.result(phase.value)


class PreviewFails(ControlledSandbox):
    async def start_preview(self, name: str, source: SourceArtifact, alive: object, preview_path: str) -> CommandEvidence:
        return self.result("verification", True)


def events(database: Database, run_id: object) -> list[BuildEvent]:
    with database.session() as session:
        return list(session.scalars(select(BuildEvent).where(BuildEvent.run_id == run_id).order_by(BuildEvent.sequence)))


def template_body(body: StartBuild) -> StartBuild:
    return StartBuild(proposal_id=body.proposal_id, template="orders")


def test_template_build_publishes_the_seed_without_calling_the_model(database: Database, configured: Settings, project_plan: ProjectPlan) -> None:
    owner, pid, body = setup_build(database, configured, project_plan)
    run = service.queue(database, configured, owner, pid, template_body(body), "template")
    provider, sandbox = SourceProvider(), ControlledSandbox()
    assert asyncio.run(BuildWorker(database, configured, sandbox, provider).run_once())
    detail = service.detail(database, owner, pid, run.id)
    assert detail.run.status == "succeeded" and provider.calls == 0
    assert [c.attempt for c in detail.candidates] == [0, 1] and detail.candidates[0].digest == detail.candidates[1].digest
    assert {f["path"] for f in detail.candidates[0].files} >= {"lib/orders.ts", "lib/vn.ts", "tests/orders.test.mjs"}
    saved = workspace(database, owner, pid)
    assert saved.current_version and saved.current_version.mode == "real"
    decisions = saved.current_brain.content.design_decisions
    template = [d for d in decisions if d.provenance.fixture_ref == "orders-template@2"]
    assert len(template) == 1 and template[0].provenance.source == "template" and template[0].provenance.run_id == run.id
    assert template[0].provenance.candidate_id == detail.candidates[0].id
    assert {d.provenance.source for d in decisions} >= {"template", "generated", "verified", "published"}
    assert "model_proposed" not in {d.provenance.source for d in decisions}
    trail = events(database, run.id)
    queued = next(e for e in trail if e.type == "execution.queued")
    applied = next(e for e in trail if e.type == "execution.template_applied")
    assert queued.payload["template_id"] == "orders" and queued.payload["template_version"] == 2
    assert applied.payload["provenance"] == "template" and applied.payload["candidate_id"] == str(detail.candidates[0].id)
    assert applied.payload["template_id"] == "orders" and applied.payload["template_version"] == 2


def test_repaired_template_records_both_template_and_model_provenance(database: Database, configured: Settings, project_plan: ProjectPlan) -> None:
    owner, pid, body = setup_build(database, configured, project_plan)
    run = service.queue(database, configured, owner, pid, template_body(body), "template-repair")
    provider = SourceProvider()
    asyncio.run(BuildWorker(database, configured, FirstTypecheckFails(), provider).run_once())
    detail = service.detail(database, owner, pid, run.id)
    assert detail.run.status == "succeeded" and provider.calls == 1 and detail.repair_attempts == 1
    assert detail.candidates[-1].parent_digest == detail.candidates[0].digest
    sources = {d.provenance.source for d in workspace(database, owner, pid).current_brain.content.design_decisions}
    assert {"template", "model_proposed", "published"} <= sources


def test_same_key_with_different_template_is_rejected_without_duplicates(database: Database, configured: Settings, project_plan: ProjectPlan) -> None:
    owner, pid, body = setup_build(database, configured, project_plan)
    run = service.queue(database, configured, owner, pid, template_body(body), "shared-key")
    assert service.queue(database, configured, owner, pid, template_body(body), "shared-key").id == run.id
    with pytest.raises(ApplicationError, match="IDEMPOTENCY_KEY_REUSED"):
        service.queue(database, configured, owner, pid, body, "shared-key")
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(BuildRun).where(BuildRun.project_id == pid)) == 1
        assert session.scalar(select(func.count()).select_from(SourceCandidate).where(SourceCandidate.project_id == pid)) == 1


def test_template_free_receipt_hash_is_unchanged(database: Database, configured: Settings, project_plan: ProjectPlan) -> None:
    owner, pid, body = setup_build(database, configured, project_plan)
    service.queue(database, configured, owner, pid, body, "legacy-shape")
    legacy = hashlib.sha256(json.dumps({"proposal_id": str(body.proposal_id)}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    with database.session() as session:
        assert session.scalar(select(IdempotencyKey.request_hash).where(IdempotencyKey.key == "legacy-shape")) == legacy
    with pytest.raises(ApplicationError, match="IDEMPOTENCY_KEY_REUSED"):
        service.queue(database, configured, owner, pid, template_body(body), "legacy-shape")


def test_template_is_rejected_once_the_project_has_a_version(database: Database, configured: Settings, project_plan: ProjectPlan) -> None:
    owner, pid, body = setup_build(database, configured, project_plan)
    service.queue(database, configured, owner, pid, body, "first")
    asyncio.run(BuildWorker(database, configured, ControlledSandbox(), SourceProvider()).run_once())
    before = workspace(database, owner, pid)
    assert before.current_version is not None
    request = record_change(database, owner, pid, RecordChange(text='Start over from the order template.', base_brain_revision_id=before.project.current_brain_revision_id, base_version_id=before.project.current_version_id), str(uuid4()))
    change = review_plan(database, configured, project_plan, owner, pid, request.id, 'change')
    before = workspace(database, owner, pid)
    with pytest.raises(ApplicationError, match="TEMPLATE_REQUIRES_NEW_PROJECT"):
        service.queue(database, configured, owner, pid, template_body(change), "template-late")
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(BuildRun).where(BuildRun.project_id == pid)) == 1
        assert session.scalar(select(IdempotencyKey.id).where(IdempotencyKey.key == "template-late")) is None
    assert workspace(database, owner, pid) == before
    # The rejected key holds no receipt, so the same key works for the template-free change.
    assert service.queue(database, configured, owner, pid, change, "template-late").status == "queued"


def test_retry_of_a_failed_template_run_reuses_the_template(database: Database, configured: Settings, project_plan: ProjectPlan) -> None:
    owner, pid, body = setup_build(database, configured, project_plan)
    run = service.queue(database, configured, owner, pid, template_body(body), "template-fail")
    asyncio.run(BuildWorker(database, configured, PreviewFails(), SourceProvider()).run_once())
    assert service.detail(database, owner, pid, run.id).run.status == "failed"
    with database.session() as session:
        template = service.run_template(session, run.id)
        plan = session.scalar(select(ExecutionJob.plan_id).where(ExecutionJob.run_id == run.id))
    assert template == get_template("orders") and plan == body.proposal_id
    retry = service.queue(database, configured, owner, pid, StartBuild(proposal_id=plan, template=template.id), "template-retry", None, run.id)
    provider = SourceProvider()
    asyncio.run(BuildWorker(database, configured, ControlledSandbox(), provider).run_once())
    assert service.detail(database, owner, pid, retry.id).run.status == "succeeded" and provider.calls == 0
