from pathlib import Path

from alembic import command
from alembic.config import Config


def run_migrations() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    alembic_config = Config(str(backend_dir / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(backend_dir / "alembic"))
    command.upgrade(alembic_config, "head")
