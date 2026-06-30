from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def _read_project_metadata() -> dict[str, str]:
    root = Path(__file__).resolve().parent
    package = _read_json(root / "package.json")
    version = package["version"]
    docker_version = version.replace("+", "-")

    return {
        "version": version,
        "version_tag": f"v{version}",
        "docker_version": docker_version,
        "npm_pin": f"cloakbrowser-mcp@{version}",
        "docker_image": f"swimmwatch/cloakbrowser-mcp:{docker_version}",
        "ghcr_image": f"ghcr.io/swimmwatch/cloakbrowser-mcp:{docker_version}",
        **_read_playwright_mcp_metadata(root, version),
    }


def _read_playwright_mcp_metadata(root: Path, project_version: str) -> dict[str, str]:
    compatibility = _read_json(root / "docs" / "data" / "version-compatibility.json")
    row = next((item for item in compatibility if item["version"] == project_version), None)
    if row is None:
        raise ValueError(
            "docs/data/version-compatibility.json must contain an entry for "
            f"package version {project_version!r}"
        )
    dependency = row["playwrightMcp"]
    version = _extract_version(dependency)

    return {
        "playwright_mcp_dependency": dependency,
        "playwright_mcp_version": version,
        "playwright_mcp_package_tag": f"@playwright/mcp@{version}",
        "playwright_mcp_release_tag": f"v{version}",
        "playwright_mcp_docker_base": row["playwrightMcpDockerBase"],
    }


def _extract_version(value: str) -> str:
    match = re.search(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", value)
    if match is None:
        raise ValueError(f"Cannot extract a version from {value!r}")

    return match.group(0)


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def define_env(env: Any) -> None:
    env.variables["project"] = _read_project_metadata()
