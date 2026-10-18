from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from httpx import AsyncClient, Response

from backend.exceptions import NotFoundError
from backend.main import app
from backend.routes import dependencies as route_dependencies


@pytest.mark.anyio
async def test_get_all_buildings_success_and_not_found(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        get_all_buildings=AsyncMock(
            return_value={
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
        )
    )
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.get("/api/buildings")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["buildings"][0]["code"] == "AH"

    fake_service.get_all_buildings.side_effect = NotFoundError("none")
    response = await client.get("/api/buildings")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_get_building_success_and_not_found(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        get_building_by_id=AsyncMock(
            return_value={
                "id": 1,
                "name": "Science Center",
                "code": "SC",
                "address": "200 Research Way",
                "category_type": "academic",
                "num_floors": 2,
                "floor_svgs": ["<svg>1</svg>", "<svg>2</svg>"],
            }
        )
    )
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.get("/api/buildings/1")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["code"] == "SC"

    fake_service.get_building_by_id.side_effect = NotFoundError("missing")
    response = await client.get("/api/buildings/1")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_get_building_categories_success_and_not_found(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(get_all_building_categories=AsyncMock(return_value=["academic", "residential"]))
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.get("/api/buildings/categories")
    assert response.status_code == status.HTTP_200_OK
    assert "academic" in response.json()

    fake_service.get_all_building_categories.side_effect = NotFoundError("no-categories")
    response = await client.get("/api/buildings/categories")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_get_indoor_map_success_and_not_found(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        getIndoorMap=AsyncMock(
            return_value={
                "svg": "<svg />",
                "nodes": [{"id": 1, "type": "room", "label": "101", "x": 1.0, "y": 2.0}],
                "edges": [{"id": 1, "source_node_id": 1, "target_node_id": 1}],
            }
        )
    )
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.get("/api/buildings/map", params={"bld_code": "ENG", "floor_num": 1})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["nodes"][0]["type"] == "room"

    fake_service.getIndoorMap.side_effect = NotFoundError("missing-map")
    response = await client.get("/api/buildings/map", params={"bld_code": "ENG", "floor_num": 1})
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_update_indoor_map_success_and_error_mappings(client: AsyncClient) -> None:
    payload = {
        "bld_code": "ENG",
        "floor_num": 1,
        "nodes": [{"id": 1, "type": "room", "label": "101", "x": 1.0, "y": 2.0}],
        "edges": [{"id": "e1", "source_node_id": 1, "target_node_id": 1}],
    }
    fake_service = SimpleNamespace(updateIndoorMap=AsyncMock(return_value=None))
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/buildings/map",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_200_OK

    fake_service.updateIndoorMap.side_effect = NotFoundError("missing")
    response = await client.post(
        "/api/buildings/map",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    fake_service.updateIndoorMap.side_effect = ValueError("bad")
    response = await client.post(
        "/api/buildings/map",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_create_building_success_and_error_mappings(client: AsyncClient) -> None:
    payload = {
        "name": "Library Annex",
        "code": "LIBA",
        "address": "789 Campus Lane",
        "category_type": "academic",
        "num_floors": 2,
        "floor_svgs": ["<svg>1</svg>", "<svg>2</svg>"],
    }
    fake_service = SimpleNamespace(createBuilding=AsyncMock(return_value=None))
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/buildings",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_200_OK

    fake_service.createBuilding.side_effect = NotFoundError("missing")
    response = await client.post(
        "/api/buildings",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    fake_service.createBuilding.side_effect = ValueError("bad")
    response = await client.post(
        "/api/buildings",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_update_building_success_and_error_mappings(client: AsyncClient) -> None:
    payload = {
        "name": "Updated Building",
        "address": "202 New Street",
        "num_floors": 2,
        "floor_svgs": ["<svg>1</svg>", "<svg>2</svg>"],
    }
    fake_service = SimpleNamespace(update_building=AsyncMock(return_value=None))
    app.dependency_overrides[route_dependencies._get_buildings_service] = lambda: fake_service

    response: Response = await client.patch(
        "/api/buildings/1",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_200_OK

    fake_service.update_building.side_effect = NotFoundError("missing")
    response = await client.patch(
        "/api/buildings/1",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    fake_service.update_building.side_effect = ValueError("bad")
    response = await client.patch(
        "/api/buildings/1",
        headers={"Authorization": "Bearer admin"},
        json=payload,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
