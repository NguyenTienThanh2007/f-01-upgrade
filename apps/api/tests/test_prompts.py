import pytest

from f01.providers.openai_source import SOURCE_INSTRUCTIONS
from f01.providers.prompts import CONTEXT_INSTRUCTIONS, PLANNING_INSTRUCTIONS


@pytest.mark.parametrize("instructions", [PLANNING_INSTRUCTIONS, CONTEXT_INSTRUCTIONS])
def test_planning_defaults_target_vietnamese_browser_only_shop_apps(instructions: str) -> None:
    for expected in ("Vietnamese with full diacritics", "1.250.000 ₫", "dd/mm/yyyy", "mobile-first", "localStorage", "browser-only"):
        assert expected in instructions
    assert "FastAPI" not in instructions
    assert "Tailwind" not in instructions


def test_context_planning_preserves_existing_product_conventions() -> None:
    rule = ("When changing an existing product, keep its current\nlanguage, money and date formats and other conventions; "
            "the defaults below apply\nonly to a new product.")
    assert rule in CONTEXT_INSTRUCTIONS
    # The preservation rule must precede the defaults it scopes.
    assert CONTEXT_INSTRUCTIONS.index(rule) < CONTEXT_INSTRUCTIONS.index("plan for Vietnamese small-shop owners")
    assert "existing product" not in PLANNING_INSTRUCTIONS


def test_planning_prompts_keep_existing_safety_rules() -> None:
    assert "never claim code was built, tested or deployed" in PLANNING_INSTRUCTIONS
    assert "Do not\nrequest or include credentials" in PLANNING_INSTRUCTIONS
    assert "Never request/include secrets" in CONTEXT_INSTRUCTIONS
    assert "Do not call tools or write code" in CONTEXT_INSTRUCTIONS


def test_source_instructions_describe_vietnamese_defaults_and_test_rules() -> None:
    for expected in ('<html lang="vi">', "full diacritics", "formatVND", "1.250.000 ₫", "dd/mm/yyyy", "lib/vn.ts",
                     "toCSV", "localStorage", "375px", "44px", "explicit .ts extension", "erasable"):
        assert expected in SOURCE_INSTRUCTIONS


def test_source_instructions_keep_existing_safety_rules() -> None:
    for expected in ("untrusted product data", "Do not propose commands, package manifests, dependencies, config,\nsecrets",
                     "claims that tests/builds ran", "Repair only issues in observed\nrepair evidence"):
        assert expected in SOURCE_INSTRUCTIONS
