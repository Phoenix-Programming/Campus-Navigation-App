from svgelements import SVG, Ellipse, Circle
from typing import Any, Final, Optional
import xml.etree.ElementTree as ET
import json
import re
import sys
import traceback

type Node = dict[str, str | int | float | None]

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

		nodes.append({ "id": id, "x": abs_cx, "y": abs_cy })

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
		id: Any = node.get('id')
		if not isinstance(id, str): raise ValueError(f"Invalid node ID: {id}")

		label: str | None = labels.get(id)
		if not label: continue

		node["label"] = label

	return nodes


def determine_node_type(label: str) -> Optional[str]:
	"""
	Determine node type from inkscape:label.
	Returns: 'hall', 'room', 'door', 'elevator', or None
	"""
	label_lower = label.lower()

	# Elevators
	if 'elevator' in label_lower: return 'elevator'

	# Water fountains
	if 'water' in label_lower and 'fountain' in label_lower: return 'water_fountain'

	# Entrances/Exits (treated as doors)
	if 'entry' in label_lower or 'entrance' in label_lower or 'exit' in label_lower: return 'door'

	# Doors (room doors)
	if '_door' in label_lower: return 'door'

	# Hallways
	if 'hallway' in label_lower or 'hall' in label_lower or label_lower in ['centerhallway', 'mosaiccafe']: return 'hall'

	# Rooms (must start with 'room' and not contain '_door')
	if label_lower.startswith('room') and '_door' not in label_lower: return 'room'

	return None


def generate_hall_node_id(label: str) -> str:
	"""
	Generate hallway node ID from label according to the format requirements.
	"""
	label_lower: str = label.lower()
	num: re.Match | None
	num_str: str

	# Hallways: convert "northHallway1" -> "hall_n-s_a_1", etc.
	# This is a simplified mapping - you may need to adjust based on actual labels
	if 'northhallway' in label_lower:
		num = re.search(r'(\d+)', label)
		num_str = num.group(1) if num else '1'
		return f"hall_n-s_a_{num_str}"

	if 'southhallway' in label_lower:
		num = re.search(r'(\d+)', label)
		num_str = num.group(1) if num else '1'
		return f"hall_n-s_b_{num_str}"

	if 'easthallway' in label_lower:
		num = re.search(r'(\d+)', label)
		num_str = num.group(1) if num else '1'
		return f"hall_e-w_c_{num_str}"

	if 'westhallway' in label_lower:
		num = re.search(r'(\d+)', label)
		num_str = num.group(1) if num else '1'
		return f"hall_e-w_d_{num_str}"

	raise ValueError(f"Could not determine hallway ID from label: {label}")

	# if label_lower == 'centerhallway': return "hall_center_1"  # TODO: Remove special case
	# if label_lower == 'mosaiccafe': return "hall_mosaic_1"  # TODO: Remove special case

	# # Fallback: use label as-is but sanitize
	# return f"hall_{label_lower.replace(' ', '_')}"


def generate_room_node_id(label: str) -> str:
	"""
	Generate room node ID from label according to the format requirements.
	"""
	# label_lower: str = label.lower()

	# Rooms: "room1000" -> "rm_1000", "room1051A" -> "rm_1051A", "room1007_room1" -> "rm_1007"
	# Handle patterns like "room1007_room1" by extracting just the room number
	room_match: re.Match | None = re.search(r'room(\d+[A-Za-z]?)(?:_room\d+)?', label, re.IGNORECASE)
	# if not room_match: return f"rm_{label_lower.replace('room', '').replace(' ', '_')}"
	if not room_match: raise ValueError(f"Could not determine room ID from label: {label}")

	room_num: str = room_match.group(1)
	return f"rm_{room_num}"


def generate_door_node_id(label: str) -> str:
	"""
	Generate door node ID from label according to the format requirements.
	"""
	label_lower: str = label.lower()

    # Doors: "room1000_door1" -> "rm_1000_door1"
	# Entrances: "northEntry" -> "entrance_north"
	# Exits: "exit_east" -> "exit_east"
	if 'entry' in label_lower or 'entrance' in label_lower:
		# Extract direction
		if 'north' in label_lower: return "entrance_north"
		if 'south' in label_lower: return "entrance_south"
		if 'east' in label_lower: return "entrance_east"
		if 'west' in label_lower: return "entrance_west"
		# return f"entrance_{label_lower.replace('entry', '').replace('entrance', '').strip('_')}"
		raise ValueError(f"Could not determine entrance direction from label: {label}")

	if 'exit' in label_lower:
		# Extract direction
		if 'north' in label_lower: return "exit_north"
		if 'south' in label_lower: return "exit_south"
		if 'east' in label_lower: return "exit_east"
		if 'west' in label_lower: return "exit_west"
		# return f"exit_{label_lower.replace('exit', '').strip('_')}"
		raise ValueError(f"Could not determine exit direction from label: {label}")

	# Room doors: "room1000_door1" -> "rm_1000_door1", "room1051A_door1" -> "rm_1051A_door1"
	door_match: re.Match | None = re.search(r'room(\d+[A-Za-z]?)_door(\d+)', label, re.IGNORECASE)
	# if not door_match: return f"door_{label_lower.replace(' ', '_')}"
	if not door_match: raise ValueError(f"Could not determine door ID from label: {label}")

	room_num: str = door_match.group(1)
	door_num: str = door_match.group(2)
	return f"rm_{room_num}_door{door_num}"


def generate_elevator_node_id(label: str) -> str:
	"""
	Generate elevator node ID from label according to the format requirements.
	"""
	label_lower: str = label.lower()

    # Elevators: "elevator" -> "elevator_south_f1" (need to determine location)
	# This is simplified - you may need to adjust based on actual labels
	if 'north' in label_lower: return "elevator_north_f1"
	if 'south' in label_lower: return "elevator_south_f1"
	if 'east' in label_lower: return "elevator_east_f1"
	if 'west' in label_lower: return "elevator_west_f1"

	raise ValueError(f"Could not determine elevator location from label: {label}")


# def generate_water_fountain_node_id(label: str) -> str:
# 	"""
# 	Generate water fountain node ID from label according to the format requirements.
# 	"""
# 	label_lower: str = label.lower()

# 	# Water fountains: "waterFountain1" -> "water_fountain_1"
# 	num_match: re.Match | None = re.search(r'water\s*fountain\s*(\d+)', label_lower)
# 	num_str: str = num_match.group(1) if num_match else '1'
# 	return f"water_fountain_{num_str}"


def generate_node_id(label: str, node_type: str) -> str:
	"""
	Generate node ID from label and type according to the format requirements.
	"""
	match node_type:
		case 'hall': return generate_hall_node_id(label)
		case 'room': return generate_room_node_id(label)
		case 'door': return generate_door_node_id(label)
		case 'elevator': return generate_elevator_node_id(label)
		# case 'water_fountain': return generate_water_fountain_node_id(label)

	return label.lower().replace(' ', '_')


def extract_room_number(node_id: str) -> tuple[int, int]:
	"""
	Extract room number for sorting purposes.
	Returns (room_num, door_num) where door_num is 0 for non-doors.
	"""
	# Rooms: "rm_1000" -> (1000, 0), "rm_1051A" -> (1051, 0)
	room_match: re.Match | None = re.search(r'rm_(\d+[A-Za-z]?)(?:_door(\d+))?$', node_id)
	if not room_match: return (0, 0)

	room_str: str = room_match.group(1)
	# Extract numeric part
	room_num_match: re.Match | None = re.search(r'(\d+)', room_str)
	room_num: int = int(room_num_match.group(1)) if room_num_match else 0
	door_num: int = int(room_match.group(2)) if room_match.group(2) else 0
	return (room_num, door_num)


def sort_key(node: Node) -> tuple[int, str, int, int]:
	"""
	Generate sort key for nodes according to ordering rules:
	1. Hallways first
	2. Rooms (by room number)
	3. Doors (by room number, then door number)
	4. Entrances/Exits
	5. Elevators
	"""
	node_id: Any = node['id']
	node_type: Any = node['type']

	if not isinstance(node_id, str) or not isinstance(node_type, str):
		raise ValueError(f"Invalid node data: id={node_id}, type={node_type}")

	# Type priority: hall=1, room=2, door=3, elevator=4
	match node_type:
		case 'hall': return (1, node_id, 0, 0)
		case 'room':
			room_num, _ = extract_room_number(node_id)
			return (2, node_id, room_num, 0)
		case 'door':
			if node_id.startswith('entrance_') or node_id.startswith('exit_'):
				# Entrances/exits come after regular doors
				return (3, node_id, 999999, 0)
			room_num, door_num = extract_room_number(node_id)
			return (3, node_id, room_num, door_num)
		case 'elevator': return (4, node_id, 0, 0)
		case _: return (5, node_id, 0, 0)


def svg_to_graph_nodes(svg_path: str, floor: int = 1) -> list[dict]:
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
		label: Any = node.get('label')
		if not isinstance(label, str):
			raise ValueError(f"Invalid label for node {node['id']}: {label}")

		# Determine node type
		node_type: str | None = determine_node_type(label)
		if not node_type:
			raise ValueError(f"Could not determine node type for label: {label}")
		node['type'] = node_type

		# Generate node ID
		node_id: str = generate_node_id(label, node_type)

		# Handle duplicate IDs by appending a suffix
		if node_id in seen_ids:
			seen_ids[node_id] += 1
			node_id = f"{node_id}_{seen_ids[node_id]}"
		else:
			seen_ids[node_id] = 0

		# Determine role
		node['role'] = "destination" if node_type == 'room' else "routing"

		# Update node x and y to be rounded to 8 decimal places
		x: Any = node['x']
		y: Any = node['y']
		if not isinstance(x, float) or not isinstance(y, float):
			raise ValueError(f"Invalid coordinates for node {node_id}: x={x}, y={y}")

		node['x'] = round(x, 8)
		node['y'] = round(y, 8)

	# Sort nodes
	nodes.sort(key=sort_key)

	return nodes


def format_output(nodes: list[dict]) -> str:
	"""
	Format nodes as JSON objects separated by newlines, grouped by type.
	"""
	output_lines = []
	current_type: str | None = None

	for node in nodes:
		# Add newline between different types
		if current_type and current_type != node['type']:
			output_lines.append('')
		current_type = node['type']

		# Format as JSON (without trailing comma)
		output_lines.append(json.dumps(node, separators=(', ', ':')))

	return '\n'.join(output_lines)


def main() -> None:
	if len(sys.argv) < 2:
		print("Usage: python svg_to_graph.py <svg_file> [floor_number]")
		sys.exit(1)

	svg_path: str = sys.argv[1]
	floor: int = int(sys.argv[2]) if len(sys.argv) > 2 else 1

	try:
		nodes: list[dict] = svg_to_graph_nodes(svg_path, floor)
		output: str = format_output(nodes)
		print(output)
	except Exception as e:
		print(f"Error: {e}", file=sys.stderr)
		traceback.print_exc()
		sys.exit(1)


if __name__ == '__main__': main()
