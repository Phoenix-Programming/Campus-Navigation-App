from httpx import AsyncClient, Response
from fastapi import status
import pytest

from backend.exceptions import NotFoundError
from backend.routes.api import building_routes


@pytest.mark.anyio
async def test_get_all_buildings_success_and_not_found(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_all_buildings(**_kwargs):
        return {
            "buildings": [
                {
                    "id": 1,
                    "name": "Alpha Hall",
                    "code": "AH",
                    "address": "456 Campus Drive",
                    "category_type": "academic",
                    "num_floors": 1,
                }
            ]
        }

    monkeypatch.setattr(building_routes.service, "get_all_buildings", fake_get_all_buildings)

    response: Response = await client.get("/api/buildings")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["buildings"][0]["code"] == "AH"

    async def fake_get_all_buildings_not_found(**_kwargs):
        raise NotFoundError("none")

    monkeypatch.setattr(building_routes.service, "get_all_buildings", fake_get_all_buildings_not_found)

    response = await client.get("/api/buildings")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_get_building_success_and_not_found(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_building_by_id(**_kwargs):
        return {
            "id": 1,
            "name": "Science Center",
            "code": "SC",
            "address": "200 Research Way",
            "category_type": "academic",
            "num_floors": 2,
            "floor_svgs": ["<svg>1</svg>", "<svg>2</svg>"],
        }

    monkeypatch.setattr(building_routes.service, "get_building_by_id", fake_get_building_by_id)

    response: Response = await client.get("/api/buildings/1")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["code"] == "SC"

    async def fake_get_building_not_found(**_kwargs):
        raise NotFoundError("missing")

    monkeypatch.setattr(building_routes.service, "get_building_by_id", fake_get_building_not_found)

    response = await client.get("/api/buildings/1")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_get_building_categories_success_and_not_found(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_categories(**_kwargs):
        return ["academic", "residential"]

    monkeypatch.setattr(building_routes.service, "get_all_building_categories", fake_get_categories)

    response: Response = await client.get("/api/buildings/categories")
    assert response.status_code == status.HTTP_200_OK
    assert "academic" in response.json()

    async def fake_get_categories_not_found(**_kwargs):
        raise NotFoundError("no-categories")

    monkeypatch.setattr(building_routes.service, "get_all_building_categories", fake_get_categories_not_found)

    response = await client.get("/api/buildings/categories")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_get_indoor_map_success_and_not_found(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_map(**_kwargs):
        return {
            "svg": "<svg />",
            "nodes": [{"id": 1, "type": "room", "label": "101", "x": 1.0, "y": 2.0}],
            "edges": [{"id": 1, "source_node_id": 1, "target_node_id": 1}],
        }

    monkeypatch.setattr(building_routes.service, "getIndoorMap", fake_get_map)

    response: Response = await client.get("/api/buildings/map", params={"bld_code": "ENG", "floor_num": 1})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["nodes"][0]["type"] == "room"

    async def fake_get_map_not_found(**_kwargs):
        raise NotFoundError("missing-map")

    monkeypatch.setattr(building_routes.service, "getIndoorMap", fake_get_map_not_found)

    response = await client.get("/api/buildings/map", params={"bld_code": "ENG", "floor_num": 1})
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_update_indoor_map_success_and_error_mappings(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "bld_code": "ENG",
        "floor_num": 1,
        "nodes": [{"id": 1, "type": "room", "label": "101", "x": 1.0, "y": 2.0}],
        "edges": [{"id": "e1", "source_node_id": 1, "target_node_id": 1}],
    }

    async def fake_update_map(**_kwargs):
        return None

    monkeypatch.setattr(building_routes.service, "updateIndoorMap", fake_update_map)

    response: Response = await client.post(
        "/api/buildings/map",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_200_OK

    async def fake_update_map_not_found(**_kwargs):
        raise NotFoundError("missing")

    monkeypatch.setattr(building_routes.service, "updateIndoorMap", fake_update_map_not_found)
    response = await client.post(
        "/api/buildings/map",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    async def fake_update_map_bad_request(**_kwargs):
        raise ValueError("bad")

    monkeypatch.setattr(building_routes.service, "updateIndoorMap", fake_update_map_bad_request)
    response = await client.post(
        "/api/buildings/map",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_create_building_success_and_error_mappings(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "name": "Library Annex",
        "code": "LIBA",
        "address": "789 Campus Lane",
        "category_type": "academic",
        "num_floors": 2,
        "floor_svgs": ["<svg>1</svg>", "<svg>2</svg>"],
    }

    async def fake_create_building(**_kwargs):
        return None

    monkeypatch.setattr(building_routes.service, "createBuilding", fake_create_building)

    response: Response = await client.post(
        "/api/buildings",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_200_OK

    async def fake_create_building_not_found(**_kwargs):
        raise NotFoundError("missing")

    monkeypatch.setattr(building_routes.service, "createBuilding", fake_create_building_not_found)
    response = await client.post(
        "/api/buildings",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    async def fake_create_building_bad_request(**_kwargs):
        raise ValueError("bad")

    monkeypatch.setattr(building_routes.service, "createBuilding", fake_create_building_bad_request)
    response = await client.post(
        "/api/buildings",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_update_building_success_and_error_mappings(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "name": "Updated Building",
        "address": "202 New Street",
        "num_floors": 2,
        "floor_svgs": ["<svg>1</svg>", "<svg>2</svg>"],
    }

    async def fake_update_building(**_kwargs):
        return None

    monkeypatch.setattr(building_routes.service, "update_building", fake_update_building)

    response: Response = await client.patch(
        "/api/buildings/1",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_200_OK

    async def fake_update_building_not_found(**_kwargs):
        raise NotFoundError("missing")

    monkeypatch.setattr(building_routes.service, "update_building", fake_update_building_not_found)
    response = await client.patch(
        "/api/buildings/1",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    async def fake_update_building_bad_request(**_kwargs):
        raise ValueError("bad")

    monkeypatch.setattr(building_routes.service, "update_building", fake_update_building_bad_request)
    response = await client.patch(
        "/api/buildings/1",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
