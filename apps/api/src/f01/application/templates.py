"""Reviewed app templates used as the first source of a new project.

Template files ship with the backend package and pass through the same proposal
validation as model output; they never bypass the source policy or verification.
"""
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from f01.application.source_artifacts import apply_proposal
from f01.domain.execution import TemplateId
from f01.domain.source import MAX_EDITS, PutFile, SourceArtifact, SourceLineage, SourceProposal

ROOT = Path(__file__).resolve().parent.parent / "templates"


@dataclass(frozen=True)
class Template:
    id: TemplateId
    version: int
    directories: tuple[str, ...]

    @property
    def ref(self) -> str:
        """Stable reference for Brain provenance (fixture_ref) and build events."""
        return f"{self.id}-template@{self.version}"


TEMPLATES: dict[str, Template] = {
    "orders": Template(id="orders", version=2, directories=("shared", "orders")),
}


def get_template(identifier: str) -> Template:
    template = TEMPLATES.get(identifier)
    if template is None:
        raise ValueError("Unknown template.")
    return template


@cache
def template_files(identifier: str) -> tuple[tuple[str, str], ...]:
    """Sorted (path, content) pairs; later directories may not shadow earlier ones."""
    files: dict[str, str] = {}
    for directory in get_template(identifier).directories:
        base = ROOT / directory
        for path in sorted(p for p in base.rglob("*") if p.is_file()):
            relative = path.relative_to(base).as_posix()
            if any(part.startswith(".") for part in relative.split("/")):
                continue  # editor/OS files such as .DS_Store are never template source
            if relative in files:
                raise ValueError("Template files overlap.")
            files[relative] = path.read_text(encoding="utf-8")
    return tuple(sorted(files.items()))


def template_proposal(identifier: str) -> SourceProposal:
    files = template_files(identifier)
    if len(files) > MAX_EDITS:
        raise ValueError("Template exceeds the proposal edit limit.")
    return SourceProposal(schema_version=1, recipe="next-web-v1", base_digest=None,
                          edits=tuple(PutFile(operation="put", path=path, prior_sha256=None, content=content) for path, content in files))


def seed_source(identifier: str, lineage: SourceLineage, forbidden_secrets: tuple[str, ...] = ()) -> SourceArtifact:
    """Initial artifact for a project with no version; validated like any proposal."""
    return apply_proposal(template_proposal(identifier), lineage, forbidden_secrets=forbidden_secrets)
