"""Explicit opt-in: runs reviewed templates in the accepted sandbox image."""
import os

import pytest


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    if os.environ.get("F01_TEMPLATE_DOCKER") != "1":
        for item in items:
            if "/tests/template_docker/" in str(item.path):
                item.add_marker(pytest.mark.skip(reason="Template sandbox check requires F01_TEMPLATE_DOCKER=1, F01_SANDBOX_IMAGE_ID and a Docker socket."))
