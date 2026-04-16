from svgelements import SVG, Ellipse, Circle
from dataclasses import dataclass
from dataclasses import asdict
from typing import Final
import xml.etree.ElementTree as ET
import json
import sys
import traceback

# Campus Navigation Project: FPU

# svg_to_graph.py: Inputs svg file, and connections json file
# outputs a json file of nodes with connections with distances between the nodes calculated from the svg file

# Usage: python svg_to_graph.py <svg_file> <connections_json_file>

# ensure that svg properties are set to display units and format units in cm

# Credits: Vincent Nguyen, Daniel Freer, Evan Chan

# This portion of the script converts an SVG file containing circles and ellipses into a list of graph nodes with absolute coordinates.
@dataclass
class SNode:
	id: str
	x: float
	y: float
	type: str | None = None
	role: str | None = None

DPI: Final[float] = 96  # Standard SVG DPI (can vary, but we're using 96)
INCH_TO_CM: Final[float] = 2.54
PX_TO_CM: Final[float] = INCH_TO_CM / DPI

def get_absolute_coordinates(svg_path) -> list[SNode]:
	"""
	Parse SVG file and extract absolute coordinates of circles/ellipses.
	"""
	svg: SVG = SVG.parse(svg_path)
	nodes: list[SNode] = []

	# Iterate through all elements in the SVG
	for element in svg.elements():
		if not isinstance(element, (Ellipse, Circle)): continue

		bbox: tuple[float, float, float, float] | None = element.bbox()
		if bbox is None: continue

		id: str = element.id  # type: ignore

		# bbox is (xmin, ymin, xmax, ymax)
		abs_cx: float = (bbox[0] + bbox[2]) / 2 * PX_TO_CM
		abs_cy: float = (bbox[1] + bbox[3]) / 2 * PX_TO_CM

		nodes.append(SNode(id=id, x=abs_cx, y=abs_cy))

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


def combine_coordinates_and_labels(nodes: list[SNode], labels: dict[str, str]) -> list[SNode]:
	"""
	Combine coordinates and labels into a list of node dictionaries.
	"""
	for node in nodes:
		if not isinstance(node.id, str): raise ValueError(f"Invalid node ID: {node.id}")

		label: str | None = labels.get(node.id)
		if not label: continue

		node.id = label

	return nodes


def sort_key(node: SNode) -> tuple[int, str, str, int]:
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


def svg_to_graph_nodes(svg_path: str) -> list[SNode]:
	"""
	Parse SVG file and extract graph nodes from circles/ellipses.
	"""
	tree = ET.parse(svg_path)
	root: ET.Element = tree.getroot()

	# Collect all circle and ellipse elements
	elements: dict[str, str] = get_labels(root)
	nodes: list[SNode] = get_absolute_coordinates(svg_path)
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


def format_output(nodes: list[SNode]) -> str:
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
		output_lines.append(json.dumps(asdict(node), separators=(', ', ':')))

	return '\n'.join(output_lines)

# This portion of the script is to import a json file for the node connections from the node_connections_helper_script and add the connections to the nodes created from the svg file.

#CNode class
# self.node_id: unique identifier for the node
# self.connections: list of connections to other nodes
# add_connection(other_node): adds a connection to another node
# to_dict(): converts the node to a dictionary format for JSON serialization
# from_dict(d): creates a node from a dictionary format
class CNode:
    def __init__(self, node_id):
        self.node_id = node_id
        self.connections = []

    def add_connection(self, other_node_id):
        if other_node_id not in self.connections:
            self.connections.append(other_node_id)

    def to_dict(self):
        return {
            "node_id": self.node_id,
            "connections": self.connections
        }
    @staticmethod
    def from_dict(d):
        node = CNode(d["node_id"])
        node.connections = d["connections"]
        return node
	
#Graph class
# self.nodes: dictionary of nodes in the graph
# to_dict(): converts the graph to a dictionary format for JSON serialization
# from_dict(d): creates a graph from a dictionary format
class Graph:
    def __init__(self):
        self.nodes = {}

    def to_dict(self):
        return {
            "nodes": [node.to_dict() for node in self.nodes.values()]
        }
    @staticmethod
    def from_dict(d):
        graph = Graph()

        for node_data in d["nodes"]:
            node = CNode.from_dict(node_data)
            graph.nodes[node.node_id] = node

        return graph
	
# Load exisiting graph from json file
def load_graph(filename):
    with open(filename, "r") as f:
        data = json.load(f)
    return Graph.from_dict(data)

# This portion of the script will take the nodes created from the svg file and add the connnections from the json file, then calculate the distances between the nodes and add them to the connections as well

class Node:
	def __init__(self, node_id):
		self.node_id = node_id
		self.connections = {} #dictionary of node_id: distance
		self.type = None
		self.role = None
	
	def add_connection(self, other_node_id, distance):
		if other_node_id not in self.connections:
			self.connections[other_node_id] = distance

	def to_dict(self):
		return {
            "node_id": self.node_id,
            "connections": self.connections,
            "type": self.type,
            "role": self.role
        }
	

# function to calculate distance between two nodes
def distance(node1: SNode, node2: SNode) -> float:
	# Calculate Euclidean distance between two nodes
	return ((node1.x - node2.x) ** 2 + (node1.y - node2.y) ** 2) ** 0.5


# function to convert the list of SNodes to a list of Nodes and add the connections from the graph
def connect_nodes(SNodes, Graph) :
	nodes = {}
	SNode_lookup = {}
	for snode in SNodes:
		SNode_lookup[snode.id] = snode

	#for each node in the list of SNodes, create a corresponding Node and add it to the nodes dictionary
	for node in SNodes:
		nodes[node.id] = Node(node.id)
		nodes[node.id].type = node.type
		nodes[node.id].role = node.role

		for connection in Graph.nodes[node.id].connections:
			dist = distance(node, SNode_lookup[connection])  # Pass the node currently being worked on and the node being connected to from the list of SNodes to calculate the distance
			nodes[node.id].add_connection(connection, dist)

	return nodes





# Main function to run the script
def main() -> None:
	if len(sys.argv) < 3:
		print("Usage: python svg_to_graph.py <svg_file> <connections_json_file>")
		sys.exit(1)

	svg_path: str = sys.argv[1]
	connections_file: str = sys.argv[2]

	try:
		nodes: list[SNode] = svg_to_graph_nodes(svg_path)
		output: str = format_output(nodes)
		print(output)
		print("Finished parsing SVG and extracting nodes.")

		graph = load_graph(connections_file)
		print("Loaded graph connections from JSON file.")

		# Combine nodes with connections
		connected_nodes = connect_nodes(nodes, graph)
		print("Combined nodes with connections and calculated distances.")

		filename = input("Enter the filename to save the json file to: ")
		with open(filename, "w") as f:
			json.dump([node.to_dict() for node in connected_nodes.values()], f, indent=2) # convert each node in the dictionary to a dictionary format and save to json file
		print(f"Saved combined nodes and connections to {filename}.")

	except Exception as e:
		print(f"Error: {e}", file=sys.stderr)
		traceback.print_exc()
		sys.exit(1)


if __name__ == '__main__': main()
