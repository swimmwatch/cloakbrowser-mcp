from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _read_project_metadata() -> dict[str, str]:
    package_json = Path(__file__).resolve().parent / "package.json"
    package = json.loads(package_json.read_text(encoding="utf-8"))
    version = package["version"]
    docker_version = version.replace("+", "-")

    return {
        "version": version,
        "version_tag": f"v{version}",
        "docker_version": docker_version,
        "npm_pin": f"cloakbrowser-mcp@{version}",
        "docker_image": f"swimmwatch/cloakbrowser-mcp:{docker_version}",
        "ghcr_image": f"ghcr.io/swimmwatch/cloakbrowser-mcp:{docker_version}",
    }


def define_env(env: Any) -> None:
    env.variables["project"] = _read_project_metadata()
