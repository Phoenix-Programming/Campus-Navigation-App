from __future__ import annotations

import json
import re
import tkinter as tk
from pathlib import Path
from tkinter import filedialog
from tkinter import messagebox
from typing import Any


TYPE_MAPPING: dict[str, str] = {
	"hall": "hallway",
	"rm": "room",
	"rmdoor": "room-door",
}


def choose_input_file(title: str) -> Path:
	root = tk.Tk()
	root.withdraw()
	root.attributes("-topmost", True)

	try:
		selected_path: str = filedialog.askopenfilename(
			title=title,
			filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
		)
	finally:
		root.destroy()

	if selected_path == "":
		raise ValueError(f"Selection cancelled. No file was chosen for {title.lower()}.")

	return Path(selected_path)


def choose_optional_input_file(title: str) -> Path | None:
	root = tk.Tk()
	root.withdraw()
	root.attributes("-topmost", True)

	try:
		selected_path: str = filedialog.askopenfilename(
			title=title,
			filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
		)
	finally:
		root.destroy()

	if selected_path == "":
		return None

	return Path(selected_path)


def choose_nodes_only() -> bool:
	root = tk.Tk()
	root.withdraw()
	root.attributes("-topmost", True)

	try:
		return bool(
			messagebox.askyesno(
				title="Connections file",
				message="Do you want to select a connections JSON file?\n\nChoose No to save a graph with an empty edges array.",
				parent=root,
			)
		)
	finally:
		root.destroy()


def choose_output_file(default_file_name: str) -> Path:
	root = tk.Tk()
	root.withdraw()
	root.attributes("-topmost", True)

	try:
		selected_path = filedialog.asksaveasfilename(
			title="Save campus map graph JSON",
			defaultextension=".json",
			initialfile=default_file_name,
			filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
		)
	finally:
		root.destroy()

	if selected_path == "":
		raise ValueError("Save cancelled. No output file was selected.")

	return Path(selected_path)


def load_json(path: Path) -> Any:
	with path.open("r", encoding="utf-8") as file:
		return json.load(file)


def load_nodes(path: Path) -> list[dict[str, Any]]:
	data = load_json(path)

	if isinstance(data, list):
		nodes = data
	elif isinstance(data, dict) and isinstance(data.get("nodes"), list):
		nodes = data["nodes"]
	else:
		raise ValueError("Nodes file must contain a JSON array or an object with a 'nodes' array.")

	for index, node in enumerate(nodes, start=1):
		if not isinstance(node, dict):
			raise ValueError(f"Node at index {index} must be a JSON object.")

	return nodes


def load_connections(path: Path) -> list[dict[str, Any]]:
	data = load_json(path)

	if not isinstance(data, dict) or not isinstance(data.get("nodes"), list):
		raise ValueError("Connections file must contain an object with a 'nodes' array.")

	connections = data["nodes"]
	for index, node in enumerate(connections, start=1):
		if not isinstance(node, dict):
			raise ValueError(f"Connection entry at index {index} must be a JSON object.")

	return connections


def infer_building_code(nodes_path: Path, nodes: list[dict[str, Any]]) -> str:
	stem_match = re.match(r"([A-Za-z]+?)(?:F\d+)?$", nodes_path.stem, re.IGNORECASE)
	if stem_match:
		return stem_match.group(1).upper()

	for node in nodes:
		node_id = node.get("id")
		if isinstance(node_id, str):
			prefix = node_id.split("_", maxsplit=1)[0].strip()
			if prefix:
				return prefix.upper()

	raise ValueError("Unable to infer building code. Pass --building-code explicitly.")


def infer_floor_num(nodes_path: Path, nodes: list[dict[str, Any]]) -> int:
	stem_match = re.search(r"F(\d+)", nodes_path.stem, re.IGNORECASE)
	if stem_match:
		return int(stem_match.group(1))

	for node in nodes:
		node_id = node.get("id")
		if isinstance(node_id, str):
			id_match = re.search(r"_f(\d+)$", node_id, re.IGNORECASE)
			if id_match:
				return int(id_match.group(1))

	raise ValueError("Unable to infer floor number. Pass --floor-num explicitly.")


def normalize_type(raw_type: Any) -> str:
	if not isinstance(raw_type, str) or raw_type.strip() == "":
		return "room"

	return TYPE_MAPPING.get(raw_type.strip().lower(), raw_type.strip().lower())


def build_graph_nodes(nodes: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
	graph_nodes: list[dict[str, Any]] = []
	id_map: dict[str, int] = {}

	for numeric_id, node in enumerate(nodes, start=1):
		raw_id = node.get("id")
		if not isinstance(raw_id, str) or raw_id.strip() == "":
			raise ValueError(f"Node at index {numeric_id} is missing a valid string id.")

		if raw_id in id_map:
			raise ValueError(f"Duplicate node id found in nodes file: {raw_id}")

		x = node.get("x")
		y = node.get("y")
		if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
			raise ValueError(f"Node '{raw_id}' must include numeric x and y coordinates.")

		id_map[raw_id] = numeric_id
		graph_nodes.append(
			{
				"id": numeric_id,
				"type": normalize_type(node.get("type")),
				"label": raw_id,
				"x": x,
				"y": y,
			}
		)

	return graph_nodes, id_map


def build_graph_edges(connection_nodes: list[dict[str, Any]], id_map: dict[str, int]) -> list[dict[str, int]]:
	edge_pairs: set[tuple[int, int]] = set()

	for entry in connection_nodes:
		raw_source = entry.get("id")
		if not isinstance(raw_source, str) or raw_source.strip() == "":
			raise ValueError("Each connection entry must include a valid string id.")

		if raw_source not in id_map:
			raise ValueError(f"Connection references unknown source node: {raw_source}")

		raw_targets = entry.get("connections")
		if not isinstance(raw_targets, list):
			raise ValueError(f"Connection entry '{raw_source}' must include a 'connections' array.")

		source_id = id_map[raw_source]
		for raw_target in raw_targets:
			if not isinstance(raw_target, str) or raw_target.strip() == "":
				raise ValueError(f"Connection target for '{raw_source}' must be a non-empty string.")

			if raw_target not in id_map:
				raise ValueError(f"Connection references unknown target node: {raw_target}")

			target_id = id_map[raw_target]
			if source_id == target_id:
				continue

			lower_id, higher_id = sorted((source_id, target_id))
			edge_pairs.add((lower_id, higher_id))

	return [
		{
			"id": edge_id,
			"source_node_id": source_id,
			"target_node_id": target_id,
		}
		for edge_id, (source_id, target_id) in enumerate(sorted(edge_pairs), start=1)
	]


def convert(nodes_file: Path, connections_file: Path, output_file: Path) -> dict[str, Any]:
	nodes: list[dict[str, Any]] = load_nodes(nodes_file)
	connection_nodes: list[dict[str, Any]] = load_connections(connections_file)

	building_code: str = infer_building_code(nodes_file, nodes)
	floor_num: int = infer_floor_num(nodes_file, nodes)

	graph_nodes, id_map = build_graph_nodes(nodes)
	graph_edges: list[dict[str, int]] = build_graph_edges(connection_nodes, id_map)

	graph: dict[str, Any] = {
		"bld_code": building_code,
		"floor_num": floor_num,
		"nodes": graph_nodes,
		"edges": graph_edges,
	}

	output_file.parent.mkdir(parents=True, exist_ok=True)
	with output_file.open("w", encoding="utf-8") as file:
		json.dump(graph, file, indent=2)
		file.write("\n")

	return graph


def convert_nodes_only(nodes_file: Path, output_file: Path) -> dict[str, Any]:
	nodes: list[dict[str, Any]] = load_nodes(nodes_file)
	building_code: str = infer_building_code(nodes_file, nodes)
	floor_num: int = infer_floor_num(nodes_file, nodes)
	graph_nodes, _ = build_graph_nodes(nodes)

	graph: dict[str, Any] = {
		"bld_code": building_code,
		"floor_num": floor_num,
		"nodes": graph_nodes,
		"edges": [],
	}

	output_file.parent.mkdir(parents=True, exist_ok=True)
	with output_file.open("w", encoding="utf-8") as file:
		json.dump(graph, file, indent=2)
		file.write("\n")

	return graph


def main() -> None:
	nodes_file: Path = choose_input_file("Select node coordinate JSON")
	output_file: Path = choose_output_file("campus-map-graph.json")
	use_connections_file = choose_nodes_only()
	connections_file = choose_input_file("Select node connections JSON") if use_connections_file else None
	graph = convert_nodes_only(nodes_file, output_file) if connections_file is None else convert(
		nodes_file=nodes_file,
		connections_file=connections_file,
		output_file=output_file
	)

	print(
		f"Wrote {len(graph['nodes'])} nodes and {len(graph['edges'])} edges to {output_file} "
		f"for building {graph['bld_code']} floor {graph['floor_num']}."
	)


if __name__ == "__main__": main()
