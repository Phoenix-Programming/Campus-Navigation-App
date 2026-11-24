from abc import ABC, abstractmethod
from backend.schema.department import Department
from backend.schema.faculty_member import FacultyMember
from backend.schema.room import Room


class FacultyRepositoryInterface(ABC):
    @abstractmethod
    async def get_all_departments(self) -> list[Department]: pass

    @abstractmethod
    async def get_department_by_name(self, name: str) -> Department | None: pass

    @abstractmethod
    async def insert_department(self, name: str) -> Department: pass

    @abstractmethod
    async def delete_department(self, department: Department) -> None: pass

    @abstractmethod
    async def get_all_faculty(self) -> list[FacultyMember]: pass

    @abstractmethod
    async def insert_faculty_member(
        self,
        departments: list[Department],
        title: str,
        first_name: str,
        last_name: str,
        room: Room | None,
        email: str | None = None,
        website: str | None = None,
        phone: str | None = None
    ) -> FacultyMember: pass

    @abstractmethod
    async def delete_faculty_member(self, faculty_member: FacultyMember) -> None: pass

    @abstractmethod
    async def get_room_by_name(self, name: str) -> Room | None: pass
