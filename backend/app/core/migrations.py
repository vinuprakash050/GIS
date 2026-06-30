import logging
from pathlib import Path

from alembic import command
from alembic.config import Config


logger = logging.getLogger(__name__)


def run_migrations() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    logger.info("Preparing Alembic config from %s", backend_dir / "alembic.ini")
    alembic_config = Config(str(backend_dir / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(backend_dir / "alembic"))
    logger.info("Running Alembic upgrade to head")
    command.upgrade(alembic_config, "head")
    logger.info("Alembic upgrade to head finished")
