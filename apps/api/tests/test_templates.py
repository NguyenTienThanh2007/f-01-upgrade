import shutil
import subprocess
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from f01.application.source_artifacts import validate_artifact
from f01.application.templates import TEMPLATES, get_template, seed_source, template_files, template_proposal
from f01.domain.execution import StartBuild
from f01.domain.source import MAX_EDITS, MAX_FILE_BYTES, MAX_SOURCE_BYTES, SourceLineage, validate_source_path, validate_text


def lineage() -> SourceLineage:
    return SourceLineage(project_id=uuid4(), request_id=uuid4(), brain_revision_id=uuid4(), plan_id=uuid4(), version_id=None)


def test_orders_template_is_versioned_with_a_stable_reference() -> None:
    assert set(TEMPLATES) == {"orders"}
    assert get_template("orders").ref == "orders-template@1"
    with pytest.raises(ValueError):
        get_template("inventory")


def test_orders_template_has_the_expected_bounded_files() -> None:
    paths = [path for path, _ in template_files("orders")]
    assert 10 <= len(paths) <= 14 and len(paths) <= MAX_EDITS
    assert {"app/layout.tsx", "app/page.tsx", "lib/orders.ts", "lib/vn.ts", "tests/orders.test.mjs", "tests/vn.test.mjs", "styles/globals.css"} <= set(paths)
    total = 0
    for path, content in template_files("orders"):
        assert validate_source_path(path) == path and validate_text(content) == content
        assert len(content.encode()) <= MAX_FILE_BYTES and "﻿" not in content
        total += len(content.encode())
    assert total <= MAX_SOURCE_BYTES


def test_orders_template_is_vietnamese_and_has_no_vietqr_yet() -> None:
    files = dict(template_files("orders"))
    assert '<html lang="vi">' in files["app/layout.tsx"]
    assert 'STORAGE_KEY = "f01.orders.v1"' in files["lib/orders.ts"]
    assert all("vietqr" not in content.lower() for content in files.values())


def test_seed_source_passes_the_same_validation_as_model_output() -> None:
    source_lineage = lineage()
    proposal = template_proposal("orders")
    assert proposal.base_digest is None and all(edit.prior_sha256 is None for edit in proposal.edits)
    artifact = seed_source("orders", source_lineage)
    validate_artifact(artifact)
    assert artifact.lineage == source_lineage and artifact.parent_digest is None
    assert [f.path for f in artifact.files] == [path for path, _ in template_files("orders")]


def test_seed_source_rejects_forbidden_secrets() -> None:
    from f01.application.source_artifacts import SourceRejected
    with pytest.raises(SourceRejected):
        seed_source("orders", lineage(), forbidden_secrets=("Quản lý đơn hàng",))


def test_start_build_accepts_only_known_templates() -> None:
    assert StartBuild.model_validate({"proposal_id": str(uuid4())}).template is None
    assert StartBuild.model_validate({"proposal_id": str(uuid4()), "template": "orders"}).template == "orders"
    with pytest.raises(ValidationError):
        StartBuild.model_validate({"proposal_id": str(uuid4()), "template": "../orders"})


@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js with type stripping is required to run template tests.")
def test_orders_template_node_tests_pass(tmp_path: Path) -> None:
    for path, content in template_files("orders"):
        target = tmp_path / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    tests = sorted(p for p, _ in template_files("orders") if p.startswith("tests/"))
    result = subprocess.run(["node", "--test", "--", *tests], cwd=tmp_path, capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stdout[-4000:]
