import subprocess


def on_pre_build(config):
    subprocess.run(["npm", "run", "docs:generate"], check=True)
