from pydantic import BaseModel


class BuildingResponse(BaseModel):
    id: int
    name: str
