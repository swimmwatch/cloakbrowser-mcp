import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from docs_macros import read_project_metadata


class ProjectMetadataTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory(prefix="cloak-docs-metadata-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.package = {
            "version": "1.2.3",
            "engines": {"node": "^22.13.0 || >=24.0.0"},
            "dependencies": {"@playwright/mcp": "^0.0.83", "cloakbrowser": "^0.6.3"},
        }
        self.compatibility = [{
            "version": "1.2.3",
            "playwrightMcp": "^0.0.82",
            "cloakbrowser": "^0.5.11",
            "playwrightMcpDockerBase": "mcr.microsoft.com/playwright/mcp:v0.0.81",
        }]
        self.workflow_path = self.root / ".github" / "workflows" / "ci.yml"
        self.workflow_path.parent.mkdir(parents=True)
        self.node_versions = {"supported": ["22", "24", "26"], "primary": "24"}
        self.write_ci_node_versions(self.node_versions)
        self.package_path = self.root / "package.json"
        self.compatibility_path = self.root / "docs" / "data" / "version-compatibility.json"
        self.compatibility_path.parent.mkdir(parents=True)
        self.write_json(self.package_path, self.package)
        self.write_json(self.compatibility_path, self.compatibility)
        self.dockerfile_path = self.root / "Dockerfile"
        self.base = "mcr.microsoft.com/playwright/mcp:v0.0.82"
        digest = "a" * 64
        self.image_argument = f"ARG PLAYWRIGHT_MCP_IMAGE={self.base}@sha256:{digest}\n"
        self.dockerfile_path.write_text(self.image_argument, encoding="utf-8")

    def write_ci_node_versions(self, versions):
        supported = json.dumps(versions["supported"])
        minimum = versions["supported"][0]
        current = versions["supported"][-1]
        primary = versions["primary"]
        workflow = (
            f"env:\n  NODE_CHECK_VERSIONS: '{supported}'\n"
            f"  NODE_MINIMUM_VERSION: '{minimum}'\n"
            f"  NODE_PRIMARY_VERSION: '{primary}'\n"
            f"  NODE_CURRENT_VERSION: '{current}'\n"
        )
        self.workflow_path.write_text(workflow, encoding="utf-8")

    def write_json(self, path, data):
        content = json.dumps(data)
        path.write_text(content, encoding="utf-8")

    def test_node_requirement_tracks_package_engines(self):
        expected = "^24.0.0 || >=26.0.0"
        self.package["engines"]["node"] = expected
        self.write_json(self.package_path, self.package)
        metadata = read_project_metadata(self.root)
        self.assertEqual(metadata["node_engine_range"], expected)

    def test_ci_node_versions_track_the_shared_configuration(self):
        versions = {"supported": ["24", "26", "27"], "primary": "26"}
        self.write_ci_node_versions(versions)
        metadata = read_project_metadata(self.root)
        self.assertEqual(metadata["node_check_versions"], "24, 26, 27")
        self.assertEqual(metadata["node_minimum_version"], "24")
        self.assertEqual(metadata["node_current_version"], "27")
        self.assertEqual(metadata["node_primary_version"], "26")

    def test_current_dependencies_are_independent_of_release_history(self):
        metadata = read_project_metadata(self.root)
        expected = {
            "playwright_mcp_dependency": "^0.0.83",
            "cloakbrowser_dependency": "^0.6.3",
            "playwright_mcp_package_tag": "@playwright/mcp@0.0.83",
            "cloakbrowser_release_tag": "v0.6.3",
            "playwright_mcp_docker_base": self.base,
            "npm_pin": "cloakbrowser-mcp@1.2.3",
        }
        actual = {key: metadata[key] for key in expected}
        self.assertEqual(actual, expected)

    def test_missing_release_entry_still_stops_metadata_generation(self):
        entries = []
        self.write_json(self.compatibility_path, entries)
        message = "must contain an entry for package version '1.2.3'"
        with self.assertRaisesRegex(ValueError, message):
            read_project_metadata(self.root)

    def test_missing_docker_argument_stops_metadata_generation(self):
        self.dockerfile_path.write_text("FROM node:24\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "one consistent PLAYWRIGHT_MCP_IMAGE"):
            read_project_metadata(self.root)

    def test_duplicate_stages_can_use_the_same_docker_base(self):
        dockerfile = self.image_argument + "FROM node:24\n" + self.image_argument
        self.dockerfile_path.write_text(dockerfile, encoding="utf-8")
        metadata = read_project_metadata(self.root)
        actual = metadata["playwright_mcp_docker_base"]
        self.assertEqual(actual, self.base)

    def test_conflicting_docker_stages_stop_metadata_generation(self):
        other_argument = "ARG PLAYWRIGHT_MCP_IMAGE=mcr.microsoft.com/playwright/mcp:v0.0.83\n"
        dockerfile = self.image_argument + other_argument
        self.dockerfile_path.write_text(dockerfile, encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "one consistent PLAYWRIGHT_MCP_IMAGE"):
            read_project_metadata(self.root)

    def test_invalid_reference_is_not_hidden_by_another_valid_stage(self):
        other_argument = "ARG PLAYWRIGHT_MCP_IMAGE=mcr.microsoft.com/playwright/mcp:v0.0.83@sha256:bad\n"
        dockerfile = self.image_argument + other_argument
        self.dockerfile_path.write_text(dockerfile, encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "invalid PLAYWRIGHT_MCP_IMAGE"):
            read_project_metadata(self.root)
