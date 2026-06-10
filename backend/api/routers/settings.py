import json

from fastapi import APIRouter

from backend.core.config import DATA_DIR
from backend.models.schemas import UserSettings

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

SETTINGS_FILE = DATA_DIR / "settings.json"


def load_settings() -> UserSettings:
    if not SETTINGS_FILE.exists():
        return UserSettings()

    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
        return UserSettings(**data)
    except (json.JSONDecodeError, OSError, TypeError, ValueError):
        return UserSettings()


def save_settings(settings: UserSettings) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp_file = SETTINGS_FILE.with_suffix(".json.tmp")

    with open(tmp_file, "w", encoding="utf-8") as file:
        json.dump(settings.model_dump(), file, ensure_ascii=False, indent=2)

    tmp_file.replace(SETTINGS_FILE)


@router.get("", response_model=UserSettings)
async def get_settings():
    return load_settings()


@router.put("", response_model=UserSettings)
async def update_settings(settings: UserSettings):
    save_settings(settings)
    return settings
