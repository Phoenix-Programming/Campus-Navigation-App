from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

from backend.auth.current_user_context import CurrentUserContext
from backend.exceptions import NotAuthorizedToEditIndoorMapError
from backend.models.buildings import IncomingIndoorEdgeModel, IndoorNodeModel
from backend.repositories.building_repository import BuildingRepository
from backend.services.buildings_service import BuildingsService


def _fake_db() -> Any:
    return cast(Any, object())


def _current_user(role: str, user_id: int) -> CurrentUserContext:
    return cast(
        CurrentUserContext,
        SimpleNamespace(role=role, user=SimpleNamespace(id=user_id), permissions=set()),
    )


def _service_with_mock_repo() -> tuple[BuildingsService, SimpleNamespace]:
    repo = SimpleNamespace(
        get_building_by_id=AsyncMock(),
        get_all_buildings=AsyncMock(),
        get_building_id_by_building_code=AsyncMock(),
        get_floor_id=AsyncMock(),
        get_indoor_svg_for_bld_floor=AsyncMock(),
        get_all_indoor_nodes_for_bld_floor=AsyncMock(),
        get_all_indoor_edges_for_bld_floor=AsyncMock(),
        delete_all_indoor_edges_for_bld_floor=AsyncMock(),
        delete_all_indoor_nodes_for_bld_floor=AsyncMock(),
        get_node_type_id_by_type=AsyncMock(),
        insert_indoor_nodes=AsyncMock(),
        insert_indoor_edges=AsyncMock(),
        get_building_category_id_by_category_type=AsyncMock(),
        insert_building=AsyncMock(),
        get_all_building_categories=AsyncMock(),
        update_building=AsyncMock(),
    )
    service = BuildingsService()
    service.repo = cast(BuildingRepository, repo)
    return service, repo


@pytest.mark.anyio
async def test_get_building_by_id_maps_response() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_building_by_id.return_value = SimpleNamespace(
        id=1,
        name="Science",
        code="SCI",
        address="1 Road",
        num_floors=2,
        building_category=SimpleNamespace(category="academic"),
        floors=[SimpleNamespace(svg="<svg>1</svg>"), SimpleNamespace(svg="<svg>2</svg>")],
    )

    response = await service.get_building_by_id(bld_id=1, db=_fake_db())

    assert response.id == 1
    assert response.category_type == "academic"
    assert response.floor_svgs == ["<svg>1</svg>", "<svg>2</svg>"]


@pytest.mark.anyio
async def test_get_all_buildings_maps_collection() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_all_buildings.return_value = [
        SimpleNamespace(
            id=1,
            name="Science",
            code="SCI",
            address="1 Road",
            num_floors=2,
            building_category=SimpleNamespace(category="academic"),
        )
    ]

    response = await service.get_all_buildings(db=_fake_db())

    assert len(response.buildings) == 1
    assert response.buildings[0].code == "SCI"


@pytest.mark.anyio
async def test_get_indoor_map_maps_nodes_and_edges() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_building_id_by_building_code.return_value = 10
    repo.get_floor_id.return_value = 20
    repo.get_indoor_svg_for_bld_floor.return_value = "<svg></svg>"
    repo.get_all_indoor_nodes_for_bld_floor.return_value = [
        SimpleNamespace(id=100, node_type=SimpleNamespace(type="room"), label="A", x=1.0, y=2.0)
    ]
    repo.get_all_indoor_edges_for_bld_floor.return_value = [
        SimpleNamespace(id=500, source_node_id=100, target_node_id=100)
    ]

    response = await service.getIndoorMap(bld_code="SCI", floor_num=1, db=_fake_db())

    assert response.svg == "<svg></svg>"
    assert response.nodes[0].type == "room"
    assert response.edges[0].id == 500


@pytest.mark.anyio
async def test_update_indoor_map_requires_admin_or_editor() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user(role="user", user_id=1)

    with pytest.raises(NotAuthorizedToEditIndoorMapError):
        await service.updateIndoorMap(
            bld_code="SCI",
            floor_num=1,
            nodes=[],
            edges=[],
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_indoor_map_rejects_edge_refs_not_in_nodes() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=4)
    repo.get_building_id_by_building_code.return_value = 10
    repo.get_floor_id.return_value = 20
    repo.get_node_type_id_by_type.return_value = 1
    repo.insert_indoor_nodes.return_value = [100]

    nodes = [IndoorNodeModel(id=1, type="room", label="A", x=1.0, y=1.0)]
    edges = [IncomingIndoorEdgeModel(id="e", source_node_id=999, target_node_id=1000)]

    with pytest.raises(ValueError):
        await service.updateIndoorMap(
            bld_code="SCI",
            floor_num=1,
            nodes=nodes,
            edges=edges,
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_indoor_map_success() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user(role="editor", user_id=4)
    repo.get_building_id_by_building_code.return_value = 10
    repo.get_floor_id.return_value = 20
    repo.get_node_type_id_by_type.side_effect = [1, 2]
    repo.insert_indoor_nodes.return_value = [100, 200]

    nodes = [
        IndoorNodeModel(id=1, type="room", label="A", x=1.0, y=1.0),
        IndoorNodeModel(id=2, type="hallway", label="B", x=2.0, y=2.0),
    ]
    edges = [IncomingIndoorEdgeModel(id="e", source_node_id=1, target_node_id=2)]

    await service.updateIndoorMap(
        bld_code="SCI",
        floor_num=1,
        nodes=nodes,
        edges=edges,
        current_user=current_user,
        db=_fake_db(),
    )

    repo.insert_indoor_edges.assert_awaited_once()


@pytest.mark.anyio
async def test_create_building_requires_admin_or_editor() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user(role="user", user_id=1)

    with pytest.raises(NotAuthorizedToEditIndoorMapError):
        await service.createBuilding(
            name="N",
            code="C",
            address="A",
            category_type="academic",
            num_floors=1,
            floor_svgs=["<svg></svg>"],
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_create_building_validates_floor_count() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=1)

    with pytest.raises(ValueError):
        await service.createBuilding(
            name="N",
            code="C",
            address="A",
            category_type="academic",
            num_floors=2,
            floor_svgs=["one"],
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_create_building_defaults_empty_svgs_and_normalizes_none() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=1)
    repo.get_building_category_id_by_category_type.return_value = 50

    await service.createBuilding(
        name="N",
        code="C",
        address="A",
        category_type="academic",
        num_floors=2,
        floor_svgs=None,
        current_user=current_user,
        db=_fake_db(),
    )

    kwargs = repo.insert_building.await_args.kwargs
    assert kwargs["floor_svgs"] == ["", ""]


@pytest.mark.anyio
async def test_get_all_building_categories_returns_strings() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_all_building_categories.return_value = [
        SimpleNamespace(category="academic"),
        SimpleNamespace(category="residential"),
    ]

    categories = await service.get_all_building_categories(db=_fake_db())

    assert categories == ["academic", "residential"]


@pytest.mark.anyio
async def test_update_building_requires_admin_or_editor() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user(role="user", user_id=1)

    with pytest.raises(NotAuthorizedToEditIndoorMapError):
        await service.update_building(
            bld_id=1,
            name=None,
            code=None,
            address=None,
            category_type=None,
            num_floors=None,
            floor_svgs=None,
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_building_requires_at_least_one_field() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=1)

    with pytest.raises(ValueError):
        await service.update_building(
            bld_id=1,
            name=None,
            code=None,
            address=None,
            category_type=None,
            num_floors=None,
            floor_svgs=None,
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_building_validates_floor_svg_count() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=1)
    repo.get_building_by_id.return_value = SimpleNamespace(num_floors=2)

    with pytest.raises(ValueError):
        await service.update_building(
            bld_id=1,
            name="X",
            code=None,
            address=None,
            category_type=None,
            num_floors=2,
            floor_svgs=["one"],
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_building_success_with_category_lookup() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=9)
    repo.get_building_by_id.return_value = SimpleNamespace(num_floors=1)
    repo.get_building_category_id_by_category_type.return_value = 44

    await service.update_building(
        bld_id=1,
        name="New",
        code="NW",
        address="Road",
        category_type="academic",
        num_floors=1,
        floor_svgs=["<svg></svg>"],
        current_user=current_user,
        db=_fake_db(),
    )

    repo.update_building.assert_awaited_once()
    kwargs = repo.update_building.await_args.kwargs
    assert kwargs["category_id"] == 44


@pytest.mark.anyio
async def test_update_building_success_without_category_or_floor_svgs() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user(role="admin", user_id=9)
    repo.get_building_by_id.return_value = SimpleNamespace(num_floors=3)

    await service.update_building(
        bld_id=1,
        name="Name Only",
        code=None,
        address=None,
        category_type=None,
        num_floors=None,
        floor_svgs=None,
        current_user=current_user,
        db=_fake_db(),
    )

    repo.get_building_category_id_by_category_type.assert_not_awaited()
    kwargs = repo.update_building.await_args.kwargs
    assert kwargs["category_id"] is None
