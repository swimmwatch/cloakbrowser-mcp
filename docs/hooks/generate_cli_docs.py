from pathlib import Path
import subprocess


def on_pre_build(config):
    config_file_path = getattr(config, "config_file_path", None) or config.get("config_file_path")
    root = Path(config_file_path).resolve().parent if config_file_path else Path.cwd()
    subprocess.run(["npm", "run", "docs:cli"], cwd=root, check=True)
