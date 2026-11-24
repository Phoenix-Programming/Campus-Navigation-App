from fastapi import Depends
from typing import Annotated
from backend.repositories.building_repository import BuildingRepository
from backend.repositories.faculty_repository import FacultyRepository
from backend.repositories.user_repository import UserRepository
from backend.services.buildings_service import BuildingsService
from backend.services.email_service import EmailService
from backend.services.faculty_service import FacultyService
from backend.services.user_service import UserService
from backend.utilities.db_connection import Database


def _get_user_service(db: Database) -> UserService:
    user_repo: UserRepository = UserRepository(db=db)
    email_service: EmailService = EmailService()

    return UserService(user_repo=user_repo, email_service=email_service)


def _get_buildings_service(db: Database) -> BuildingsService:
    bld_repo: BuildingRepository = BuildingRepository(db=db)

    return BuildingsService(bld_repo=bld_repo)


def _get_faculty_service(db: Database) -> FacultyService:
    faculty_repo: FacultyRepository = FacultyRepository(db=db)
    email_service: EmailService = EmailService()

    return FacultyService(faculty_repository=faculty_repo, email_service=email_service)


UserServiceDep = Annotated[UserService, Depends(_get_user_service)]
BuildingsServiceDep = Annotated[BuildingsService, Depends(_get_buildings_service)]
FacultyServiceDep = Annotated[FacultyService, Depends(_get_faculty_service)]
