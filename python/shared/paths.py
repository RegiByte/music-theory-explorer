from pathlib import Path
import os

def get_project_root() -> Path:
    return Path(__file__).parent.parent.parent


def get_data_dir() -> Path:
    data_dir = get_project_root() / "data"
    data_dir.mkdir(exist_ok=True)
    return data_dir


def navigate_to_project_root():
    os.chdir(get_project_root())