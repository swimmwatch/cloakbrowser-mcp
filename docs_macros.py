from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def read_project_metadata(root: Path | None = None) -> dict[str, str]:
    source_path = Path(__file__)
    project_root = root or source_path.resolve().parent
    package_path = project_root / "package.json"
    package = _read_json(package_path)
    version = package["version"]
    docker_version = version.replace("+", "-")
    _validate_compatibility_entry(project_root, version)
    dependencies = package["dependencies"]
    node_versions = _read_ci_node_versions(project_root)

    return {
        "version": version,
        "version_tag": f"v{version}",
        "node_engine_range": package["engines"]["node"],
        "node_check_versions": ", ".join(node_versions["supported"]),
        "node_minimum_version": node_versions["minimum"],
        "node_current_version": node_versions["current"],
        "node_primary_version": node_versions["primary"],
        "docker_version": docker_version,
        "npm_pin": f"cloakbrowser-mcp@{version}",
        "docker_image": f"swimmwatch/cloakbrowser-mcp:{docker_version}",
        "ghcr_image": f"ghcr.io/swimmwatch/cloakbrowser-mcp:{docker_version}",
        **_read_dependency_metadata(project_root, dependencies),
    }


def _read_ci_node_versions(root: Path) -> dict[str, Any]:
    workflow_path = root / ".github" / "workflows" / "ci.yml"
    workflow = workflow_path.read_text(encoding="utf-8")
    versions = {}
    fields = {"supported": "CHECK", "minimum": "MINIMUM", "primary": "PRIMARY", "current": "CURRENT"}
    for key, role in fields.items():
        pattern = rf"^ {{2}}NODE_{role}_VERSION{'S' if key == 'supported' else ''}: '([^'\n]+)'$"
        match = re.search(pattern, workflow, re.MULTILINE)
        if match is None:
            message = f"Missing Node.js workflow constant: {role}"
            raise ValueError(message)
        value = match.group(1)
        versions[key] = json.loads(value) if key == "supported" else value
    return versions


def _validate_compatibility_entry(root: Path, project_version: str) -> None:
    compatibility_path = root / "docs" / "data" / "version-compatibility.json"
    compatibility = _read_json(compatibility_path)
    matching_rows = (item for item in compatibility if item["version"] == project_version)
    row = next(matching_rows, None)
    if row is None:
        message = (
            "docs/data/version-compatibility.json must contain an entry for "
            f"package version {project_version!r}"
        )
        raise ValueError(message)


def _read_dependency_metadata(root: Path, dependencies: dict[str, str]) -> dict[str, str]:
    playwright_mcp_dependency = dependencies["@playwright/mcp"]
    playwright_mcp_version = _extract_version(playwright_mcp_dependency)
    cloakbrowser_dependency = dependencies["cloakbrowser"]
    cloakbrowser_version = _extract_version(cloakbrowser_dependency)
    docker_base = _read_docker_base(root)

    return {
        "playwright_mcp_dependency": playwright_mcp_dependency,
        "playwright_mcp_version": playwright_mcp_version,
        "playwright_mcp_package_tag": f"@playwright/mcp@{playwright_mcp_version}",
        "playwright_mcp_release_tag": f"v{playwright_mcp_version}",
        "playwright_mcp_docker_base": docker_base,
        "cloakbrowser_dependency": cloakbrowser_dependency,
        "cloakbrowser_version": cloakbrowser_version,
        "cloakbrowser_package_tag": f"cloakbrowser@{cloakbrowser_version}",
        "cloakbrowser_release_tag": f"v{cloakbrowser_version}",
    }


def _read_docker_base(root: Path) -> str:
    dockerfile_path = root / "Dockerfile"
    dockerfile = dockerfile_path.read_text(encoding="utf-8")
    argument_pattern = r"^ARG PLAYWRIGHT_MCP_IMAGE=(\S+)$"
    references = re.findall(argument_pattern, dockerfile, re.MULTILINE)
    reference_pattern = (
        r"(mcr\.microsoft\.com/playwright/mcp:[0-9A-Za-z_.-]+)"
        r"(?:@sha256:[a-f0-9]{64})?"
    )
    bases = set()
    for reference in references:
        match = re.fullmatch(reference_pattern, reference)
        if match is None:
            message = "Dockerfile contains an invalid PLAYWRIGHT_MCP_IMAGE base reference"
            raise ValueError(message)
        base = match.group(1)
        bases.add(base)
    if len(bases) != 1:
        message = "Dockerfile must define one consistent PLAYWRIGHT_MCP_IMAGE base reference"
        raise ValueError(message)
    return bases.pop()


def _extract_version(value: str) -> str:
    match = re.search(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", value)
    if match is None:
        message = f"Cannot extract a version from {value!r}"
        raise ValueError(message)

    return match.group(0)


def _read_json(path: Path) -> Any:
    content = path.read_text(encoding="utf-8")
    return json.loads(content)


def define_env(env: Any) -> None:
    env.variables["project"] = read_project_metadata()
