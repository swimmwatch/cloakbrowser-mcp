from pathlib import Path
import importlib.util
import subprocess

from jinja2 import Environment, StrictUndefined


def on_pre_build(config):
    config_file_path = getattr(config, "config_file_path", None) or config.get("config_file_path")
    root = Path(config_file_path).resolve().parent if config_file_path else Path.cwd()
    subprocess.run(["npm", "run", "docs:cli"], cwd=root, check=True)
    render_llms_txt(root)


def render_llms_txt(root):
    template_path = root / "docs" / "hooks" / "templates" / "llms.txt.jinja"
    target_path = root / "docs" / "llms.txt"
    environment = Environment(
        autoescape=False,
        keep_trailing_newline=True,
        undefined=StrictUndefined,
    )
    template = environment.from_string(template_path.read_text(encoding="utf-8"))
    rendered = template.render(project=read_project_metadata(root))
    target_path.write_text(rendered, encoding="utf-8")


def read_project_metadata(root):
    module_path = root / "docs_macros.py"
    spec = importlib.util.spec_from_file_location("docs_macros", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load docs macro module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.read_project_metadata(root)
