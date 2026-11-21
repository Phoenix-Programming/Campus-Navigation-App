from abc import ABC, abstractmethod


class FacultyServiceInterface(ABC):
    @abstractmethod
    async def scrape_faculty_data(self) -> None: pass
