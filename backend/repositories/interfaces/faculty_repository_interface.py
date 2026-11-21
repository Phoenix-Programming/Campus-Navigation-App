from abc import ABC, abstractmethod
from backend.schema.department import Department
from backend.schema.employee import Employee
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
    async def get_all_employees(self) -> list[Employee]: pass

    @abstractmethod
    async def insert_employee(
        self,
        departments: list[Department],
        title: str,
        first_name: str,
        last_name: str,
        room_id: int | None,
        email: str | None = None,
        website: str | None = None,
        phone: str | None = None
    ) -> Employee: pass

    @abstractmethod
    async def delete_employee(self, employee: Employee) -> None: pass

    @abstractmethod
    async def get_room_by_name(self, name: str) -> Room | None: pass
