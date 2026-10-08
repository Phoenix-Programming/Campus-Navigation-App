from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.exceptions import (
    BuildingCategoryNotFoundError,
    BuildingCodeNotFoundError,
    BuildingNotFoundError,
    FloorNumberNotFoundError,
    NodeTypeNotFoundError,
)
from backend.repositories.building_repository import BuildingRepository


def _result(*, first=None, all_values=None, one_or_none=None, scalar_one_or_none=None):
    scalars = MagicMock()
    scalars.first.return_value = first
    scalars.all.return_value = all_values if all_values is not None else []
    scalars.one_or_none.return_value = one_or_none

    result = MagicMock()
    result.scalars.return_value = scalars
    result.scalar_one_or_none.return_value = scalar_one_or_none
    return result


def _db_with_execute(return_values: list[Any]) -> Any:
    execute_mock = (
        AsyncMock(side_effect=return_values)
        if return_values
        else AsyncMock(return_value=MagicMock())
    )

    return SimpleNamespace(
        execute=execute_mock,
        add=MagicMock(),
        add_all=MagicMock(),
        flush=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )


@pytest.mark.anyio
async def test_get_all_buildings_returns_all() -> None:
    repo = BuildingRepository()
    building = SimpleNamespace(id=1)
    db = _db_with_execute([_result(all_values=[building])])

    buildings = await repo.get_all_buildings(db=cast(Any, db))

    assert len(buildings) == 1
    assert buildings[0].id == 1


@pytest.mark.anyio
async def test_get_building_id_by_code_not_found_raises() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([_result(one_or_none=None)])

    with pytest.raises(BuildingCodeNotFoundError):
        await repo.get_building_id_by_building_code("MISSING", db=cast(Any, db))


@pytest.mark.anyio
async def test_get_building_id_by_code_success() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([_result(one_or_none=SimpleNamespace(id=4))])

    bld_id = await repo.get_building_id_by_building_code("SCI", db=cast(Any, db))

    assert bld_id == 4


@pytest.mark.anyio
async def test_get_floor_id_not_found_raises() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([_result(one_or_none=None)])

    with pytest.raises(FloorNumberNotFoundError):
        await repo.get_floor_id(1, 10, db=cast(Any, db))


@pytest.mark.anyio
async def test_get_indoor_svg_not_found_raises() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([_result(one_or_none=None)])

    with pytest.raises(FloorNumberNotFoundError):
        await repo.get_indoor_svg_for_bld_floor(1, db=cast(Any, db))


@pytest.mark.anyio
async def test_get_indoor_nodes_and_edges_return_lists() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([
        _result(all_values=[SimpleNamespace(id=11)]),
        _result(all_values=[SimpleNamespace(id=21)]),
    ])

    nodes = await repo.get_all_indoor_nodes_for_bld_floor(1, 1, db=cast(Any, db))
    edges = await repo.get_all_indoor_edges_for_bld_floor(1, 1, db=cast(Any, db))

    assert nodes[0].id == 11
    assert edges[0].id == 21


@pytest.mark.anyio
async def test_insert_indoor_nodes_success_returns_ids() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([])

    # Simulate DB assigning IDs when flushed.
    def assign_ids(nodes):
        for idx, node in enumerate(nodes, start=100):
            node.id = idx

    db.add_all.side_effect = assign_ids

    inserted = await repo.insert_indoor_nodes(
        bld_id=1,
        floor_id=1,
        nodes_coords=[(1.0, 2.0), (3.0, 4.0)],
        nodes_labels=["A", "B"],
        node_types_ids=[1, 2],
        current_user_id=1,
        db=cast(Any, db),
    )

    assert inserted == [100, 101]
    db.commit.assert_awaited_once()


@pytest.mark.anyio
async def test_insert_indoor_nodes_rollback_on_flush_error() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([])
    db.flush = AsyncMock(side_effect=RuntimeError("flush failed"))

    with pytest.raises(RuntimeError, match="flush failed"):
        await repo.insert_indoor_nodes(
            bld_id=1,
            floor_id=1,
            nodes_coords=[(1.0, 2.0)],
            nodes_labels=["A"],
            node_types_ids=[1],
            current_user_id=1,
            db=cast(Any, db),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_insert_indoor_edges_rollback_on_commit_error() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([])
    db.commit = AsyncMock(side_effect=RuntimeError("commit failed"))

    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.insert_indoor_edges(
            bld_id=1,
            floor_id=1,
            source_nodes_ids=[1],
            target_nodes_ids=[2],
            current_user_id=1,
            db=cast(Any, db),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_delete_indoor_nodes_edges_rollback_on_commit_error() -> None:
    repo = BuildingRepository()

    db_nodes = _db_with_execute([])
    db_nodes.commit = AsyncMock(side_effect=RuntimeError("commit failed"))
    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.delete_all_indoor_nodes_for_bld_floor(1, 1, db=cast(Any, db_nodes))
    db_nodes.rollback.assert_awaited_once()

    db_edges = _db_with_execute([])
    db_edges.commit = AsyncMock(side_effect=RuntimeError("commit failed"))
    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.delete_all_indoor_edges_for_bld_floor(1, 1, db=cast(Any, db_edges))
    db_edges.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_get_building_category_and_node_type_lookup() -> None:
    repo = BuildingRepository()

    db_category = _db_with_execute([_result(scalar_one_or_none=5)])
    category_id = await repo.get_building_category_id_by_category_type("academic", db=cast(Any, db_category))
    assert category_id == 5

    db_missing_category = _db_with_execute([_result(scalar_one_or_none=None)])
    with pytest.raises(BuildingCategoryNotFoundError):
        await repo.get_building_category_id_by_category_type("missing", db=cast(Any, db_missing_category))

    db_node_type = _db_with_execute([_result(scalar_one_or_none=7)])
    node_type_id = await repo.get_node_type_id_by_type("room", db=cast(Any, db_node_type))
    assert node_type_id == 7

    db_missing_node_type = _db_with_execute([_result(scalar_one_or_none=None)])
    with pytest.raises(NodeTypeNotFoundError):
        await repo.get_node_type_id_by_type("missing", db=cast(Any, db_missing_node_type))


@pytest.mark.anyio
async def test_insert_building_rollback_on_commit_error() -> None:
    repo = BuildingRepository()
    db = _db_with_execute([])

    def fake_add(obj):
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            obj.id = 42

    db.add.side_effect = fake_add
    db.commit = AsyncMock(side_effect=RuntimeError("commit failed"))

    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.insert_building(
            name="N",
            code="C",
            address="A",
            category_id=1,
            num_floors=2,
            floor_svgs=["", ""],
            current_user_id=1,
            db=cast(Any, db),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_get_all_building_categories_and_node_types() -> None:
    repo = BuildingRepository()
    db_categories = _db_with_execute([_result(all_values=[SimpleNamespace(category="academic")])])
    db_node_types = _db_with_execute([_result(all_values=[SimpleNamespace(type="room")])])

    categories = await repo.get_all_building_categories(db=cast(Any, db_categories))
    node_types = await repo.get_all_node_types(db=cast(Any, db_node_types))

    assert categories[0].category == "academic"
    assert node_types[0].type == "room"


@pytest.mark.anyio
async def test_get_building_by_id_success_and_not_found() -> None:
    repo = BuildingRepository()

    db_ok = _db_with_execute([_result(one_or_none=SimpleNamespace(id=1))])
    building = await repo.get_building_by_id(1, db=cast(Any, db_ok))
    assert building.id == 1

    db_missing = _db_with_execute([_result(one_or_none=None)])
    with pytest.raises(BuildingNotFoundError):
        await repo.get_building_by_id(999, db=cast(Any, db_missing))


@pytest.mark.anyio
async def test_update_building_commits_and_rolls_back(monkeypatch: pytest.MonkeyPatch) -> None:
    repo = BuildingRepository()

    existing_floor = SimpleNamespace(svg="old", last_updated_by=0)
    building = SimpleNamespace(
        id=1,
        name="Old",
        code="OLD",
        address="A",
        category_id=1,
        num_floors=1,
        floors=[SimpleNamespace(floor_num=1)],
        last_updated_by=0,
    )

    async def fake_get_building_by_id(*_args, **_kwargs):
        return building

    monkeypatch.setattr(repo, "get_building_by_id", fake_get_building_by_id)

    db_ok = _db_with_execute([_result(scalar_one_or_none=existing_floor)])
    await repo.update_building(
        bld_id=1,
        name="New",
        code="NEW",
        address="B",
        category_id=2,
        num_floors=1,
        floor_svgs=["updated"],
        current_user_id=10,
        db=cast(Any, db_ok),
    )

    assert building.name == "New"
    assert existing_floor.svg == "updated"

    db_fail = _db_with_execute([_result(scalar_one_or_none=existing_floor)])
    db_fail.commit = AsyncMock(side_effect=RuntimeError("commit failed"))

    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.update_building(
            bld_id=1,
            name="X",
            code=None,
            address=None,
            category_id=None,
            num_floors=1,
            floor_svgs=["x"],
            current_user_id=1,
            db=cast(Any, db_fail),
        )

    db_fail.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_update_building_adds_new_floors_when_increasing(monkeypatch: pytest.MonkeyPatch) -> None:
    repo = BuildingRepository()
    building = SimpleNamespace(
        id=10,
        name="Old",
        code="OLD",
        address="A",
        category_id=1,
        num_floors=1,
        floors=[SimpleNamespace(floor_num=1)],
        last_updated_by=0,
    )

    async def fake_get_building_by_id(*_args, **_kwargs):
        return building

    monkeypatch.setattr(repo, "get_building_by_id", fake_get_building_by_id)
    db = _db_with_execute([])

    await repo.update_building(
        bld_id=10,
        name=None,
        code=None,
        address=None,
        category_id=None,
        num_floors=3,
        floor_svgs=["", "<svg>2</svg>", "<svg>3</svg>"],
        current_user_id=99,
        db=cast(Any, db),
    )

    # Two new floors should be added: floor 2 and floor 3.
    assert db.add.call_count == 2
    added_floor_two = db.add.call_args_list[0].args[0]
    added_floor_three = db.add.call_args_list[1].args[0]
    assert added_floor_two.floor_num == 2
    assert added_floor_three.floor_num == 3
    assert added_floor_two.svg == "<svg>2</svg>"
    assert added_floor_three.svg == "<svg>3</svg>"


@pytest.mark.anyio
async def test_update_building_decrease_executes_floor_delete(monkeypatch: pytest.MonkeyPatch) -> None:
    repo = BuildingRepository()
    building = SimpleNamespace(
        id=20,
        num_floors=3,
        floors=[SimpleNamespace(floor_num=1), SimpleNamespace(floor_num=2), SimpleNamespace(floor_num=3)],
        last_updated_by=0,
    )

    async def fake_get_building_by_id(*_args, **_kwargs):
        return building

    monkeypatch.setattr(repo, "get_building_by_id", fake_get_building_by_id)
    db = _db_with_execute([])

    await repo.update_building(
        bld_id=20,
        name=None,
        code=None,
        address=None,
        category_id=None,
        num_floors=1,
        floor_svgs=None,
        current_user_id=1,
        db=cast(Any, db),
    )

    db.execute.assert_awaited_once()


@pytest.mark.anyio
async def test_update_building_raises_when_floor_svg_target_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    repo = BuildingRepository()
    building = SimpleNamespace(
        id=30,
        num_floors=1,
        floors=[SimpleNamespace(floor_num=1)],
        last_updated_by=0,
    )

    async def fake_get_building_by_id(*_args, **_kwargs):
        return building

    monkeypatch.setattr(repo, "get_building_by_id", fake_get_building_by_id)
    db = _db_with_execute([_result(scalar_one_or_none=None)])

    with pytest.raises(FloorNumberNotFoundError):
        await repo.update_building(
            bld_id=30,
            name=None,
            code=None,
            address=None,
            category_id=None,
            num_floors=1,
            floor_svgs=["<svg>1</svg>"],
            current_user_id=1,
            db=cast(Any, db),
        )
