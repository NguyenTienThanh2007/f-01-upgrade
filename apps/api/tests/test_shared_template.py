import re
from pathlib import Path

import f01
from f01.domain.source import MAX_FILE_BYTES, MAX_SOURCE_BYTES, MAX_SOURCE_FILES, validate_source_path, validate_text

SHARED = Path(f01.__file__).parent / "templates" / "shared"


def shared_files() -> dict[str, str]:
    return {path.relative_to(SHARED).as_posix(): path.read_text(encoding="utf-8") for path in sorted(SHARED.rglob("*")) if path.is_file()}


def test_shared_template_contains_the_vietnamese_helpers_and_their_tests() -> None:
    assert {"lib/vn.ts", "tests/vn.test.mjs"} <= set(shared_files())


def test_every_shared_file_satisfies_the_generated_source_policy() -> None:
    files = shared_files()
    for path, content in files.items():
        assert validate_source_path(path) == path
        assert validate_text(content) == content
        assert "\ufeff" not in content, f"{path}: write the BOM as an escape, not a raw character"
        assert len(content.encode("utf-8")) <= MAX_FILE_BYTES
    assert len(files) <= MAX_SOURCE_FILES
    assert sum(len(content.encode("utf-8")) for content in files.values()) <= MAX_SOURCE_BYTES


def test_vietnamese_helpers_stay_self_contained_for_node_test() -> None:
    source = shared_files()["lib/vn.ts"]
    assert not re.search(r"^\s*(import|export\s.*\sfrom)\s|\bimport\(|\brequire\(", source, re.MULTILINE)
    for keyword in ("enum ", "namespace "):
        assert keyword not in source
    assert 'from "../lib/vn.ts"' in shared_files()["tests/vn.test.mjs"]
