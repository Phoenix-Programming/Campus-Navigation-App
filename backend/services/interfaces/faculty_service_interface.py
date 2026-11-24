from abc import ABC, abstractmethod
from backend.models.faculty import ScrapedFacultyMember


class FacultyServiceInterface(ABC):
    @abstractmethod
    async def update_faculty_data(self, up_to_date_faculty: list[ScrapedFacultyMember]) -> None: pass
