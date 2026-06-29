from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "GIS MVP API"
    api_prefix: str = ""
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
