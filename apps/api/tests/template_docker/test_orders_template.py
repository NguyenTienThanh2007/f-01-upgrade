"""Runs the orders template through the production DockerSandbox phases.

Uses the exact accepted image (F01_SANDBOX_IMAGE_ID) and the same materialize,
install, typecheck, build, test and preview steps as the worker. No model call
and no database. A skipped run is not evidence.
"""
import asyncio
import os
from uuid import uuid4

import httpx

from f01.application.templates import seed_source
from f01.domain.source import SourceLineage
from f01.execution.docker import DockerSandbox
from f01.execution.sandbox import CommandPhase


async def alive() -> bool:
    return True


def test_orders_template_passes_every_sandbox_phase() -> None:
    image = os.environ["F01_SANDBOX_IMAGE_ID"]
    socket = os.environ.get("F01_DOCKER_SOCKET", "/var/run/docker.sock")
    source = seed_source("orders", SourceLineage(project_id=uuid4(), request_id=uuid4(), brain_revision_id=uuid4(), plan_id=uuid4(), version_id=None))
    tests = tuple(f.path for f in source.files if f.path.startswith("tests/"))
    assert tests == ("tests/orders.test.mjs", "tests/vn.test.mjs")

    async def journey() -> None:
        async with httpx.AsyncClient(transport=httpx.AsyncHTTPTransport(uds=socket), base_url="http://docker", trust_env=False, timeout=180) as engine:
            sandbox = DockerSandbox(engine, image, 900)
            await sandbox.ready()
            name = sandbox.name(uuid4(), 1, 1)
            preview_path = f"/p/{uuid4()}/" + "a" * 43
            try:
                await sandbox.create(name, source.lineage.project_id, uuid4(), preview_path)
                evidence = [await sandbox.materialize(name, source, alive)]
                for phase in (CommandPhase.INSTALL, CommandPhase.TYPECHECK, CommandPhase.BUILD, CommandPhase.TEST):
                    evidence.append(await sandbox.command(name, phase, tests, alive))
                evidence.append(await sandbox.start_preview(name, source, alive, preview_path))
                for item in evidence:
                    assert item.exit_code == 0 and item.image_id == image, (item.phase, item.diagnostics)
                assert [e.phase for e in evidence] == ["materialization", "install", "typecheck", "build", "test", "verification"]
                status, kind, body = await sandbox.fetch(name, preview_path, alive)
                page = body.decode("utf-8")
                assert status == 200 and kind.startswith("text/html")
                assert '<html lang="vi">' in page and "Quản lý đơn hàng" in page and "Tổng tiền theo ngày" in page
            finally:
                await sandbox.remove(name)

    asyncio.run(journey())
