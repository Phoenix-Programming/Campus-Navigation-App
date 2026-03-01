from svgelements import SVG, Ellipse, Circle
from dataclasses import dataclass
from typing import Final
import xml.etree.ElementTree as ET
import json
import sys
import traceback

@dataclass
class Node:
	id: str
	x: float
	y: float
	type: str | None = None
	role: str | None = None

DPI: Final[float] = 96  # Standard SVG DPI (can vary, but we're using 96)
INCH_TO_CM: Final[float] = 2.54
PX_TO_CM: Final[float] = INCH_TO_CM / DPI

def get_absolute_coordinates(svg_path) -> list[Node]:
	"""
	Parse SVG file and extract absolute coordinates of circles/ellipses.
	"""
	svg: SVG = SVG.parse(svg_path)
	nodes: list[Node] = []

	# Iterate through all elements in the SVG
	for element in svg.elements():
		if not isinstance(element, (Ellipse, Circle)): continue

		bbox: tuple[float, float, float, float] | None = element.bbox()
		if bbox is None: continue

		id: str = element.id  # type: ignore

		# bbox is (xmin, ymin, xmax, ymax)
		abs_cx: float = (bbox[0] + bbox[2]) / 2 * PX_TO_CM
		abs_cy: float = (bbox[1] + bbox[3]) / 2 * PX_TO_CM

		nodes.append(Node(id=id, x=abs_cx, y=abs_cy))

	return nodes


def get_labels(element: ET.Element) -> dict[str, str]:
	"""
	Recursively collect all circle and ellipse elements.
	"""
	results: dict[str, str] = {}

	# Check if this is a circle or ellipse
	tag: str = element.tag.split('}')[-1] if '}' in element.tag else element.tag
	if tag in ['circle', 'ellipse']:
		id: str | None = element.get('id')
		label: str | None = element.get('{http://www.inkscape.org/namespaces/inkscape}label')

		if id is not None and label is not None: results[id] = label

	# Recursively process children
	for child in element: results.update(get_labels(child))

	return results


def combine_coordinates_and_labels(nodes: list[Node], labels: dict[str, str]) -> list[Node]:
	"""
	Combine coordinates and labels into a list of node dictionaries.
	"""
	for node in nodes:
		if not isinstance(node.id, str): raise ValueError(f"Invalid node ID: {node.id}")

		label: str | None = labels.get(node.id)
		if not label: continue

		node.id = label

	return nodes


def sort_key(node: Node) -> tuple[int, str, str, int]:
	"""
	Generate sort key for nodes according to ordering rules:
	1. Hallways first
	2. Rooms (by room number)
	3. Doors (by room number, then door number)
	4. Entrances/Exits
	5. Elevators
	"""
	room_num: str

	# Type priority: hall=1, room=2, door=3, elevator=4
	match node.type:
		case 'hall': return (1, node.id, '', 0)
		case 'room':
			room_num = node.id.lower().split('_')[2]

			return (2, node.id, room_num, 0)
		case 'door':
			# Entrances/exits come after regular doors
			if 'entrance' in node.id or 'exit' in node.id: return (3, node.id, '', 0)

			room_num = node.id.lower().split('_')[3]
			door_num: int = int(node.id.lower().split('_')[2])

			return (3, node.id, room_num, door_num)
		case 'elevator': return (4, node.id, '', 0)
		case _: return (5, node.id, '', 0)


def svg_to_graph_nodes(svg_path: str) -> list[Node]:
	"""
	Parse SVG file and extract graph nodes from circles/ellipses.
	"""
	tree = ET.parse(svg_path)
	root: ET.Element = tree.getroot()

	# Collect all circle and ellipse elements
	elements: dict[str, str] = get_labels(root)
	nodes: list[Node] = get_absolute_coordinates(svg_path)
	nodes = combine_coordinates_and_labels(nodes, elements)
	seen_ids: dict[str, int] = {}  # Track IDs and their counts to handle duplicates

	for node in nodes:
		# Determine node type
		node.type = node.id.lower().split('_')[1]

		# Handle duplicate IDs by appending a suffix
		if node.id in seen_ids:
			seen_ids[node.id] += 1
			node.id = f"{node.id}_({seen_ids[node.id]})"
		else:
			seen_ids[node.id] = 0

		# Determine role
		node.role = "destination" if node.type == 'room' else "routing"

		# Update node x and y to be rounded to 8 decimal places
		node.x = round(node.x, 8)
		node.y = round(node.y, 8)

	# Sort nodes
	nodes.sort(key=sort_key)

	return nodes


def format_output(nodes: list[Node]) -> str:
	"""
	Format nodes as JSON objects separated by newlines, grouped by type.
	"""
	output_lines: list[str] = []
	current_type: str | None = None

	for node in nodes:
		# Add newline between different types
		if current_type and current_type != node.type: output_lines.append('')
		current_type = node.type

		# Format as JSON (without trailing comma)
		output_lines.append(json.dumps(node, separators=(', ', ':')))

	return '\n'.join(output_lines)


def main() -> None:
	if len(sys.argv) < 1:
		print("Usage: python svg_to_graph.py <svg_file>")
		sys.exit(1)

	svg_path: str = sys.argv[1]

	try:
		nodes: list[Node] = svg_to_graph_nodes(svg_path)
		output: str = format_output(nodes)
		print(output)
	except Exception as e:
		print(f"Error: {e}", file=sys.stderr)
		traceback.print_exc()
		sys.exit(1)


if __name__ == '__main__': main()
