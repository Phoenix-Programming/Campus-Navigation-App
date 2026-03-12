import json
# Campus Navigation Project: FPU

#run with python .\node_connections_helper_script.py


# This script will help you create a node connections json file for graphs
# The base node will be added as the first node in the json file and all other nodes



#Node class
# self.node_id: unique identifier for the node
# self.connections: list of connections to other nodes
# add_connection(other_node): adds a connection to another node
# to_dict(): converts the node to a dictionary format for JSON serialization
# from_dict(d): creates a node from a dictionary format
class Node:
    def __init__(self, node_id):
        self.node_id = node_id
        self.connections = []

    def add_connection(self, other_node_id):
        self.connections.append(other_node_id)

    def to_dict(self):
        return {
            "node_id": self.node_id,
            "connections": self.connections
        }
    @staticmethod
    def from_dict(d):
        node = Node(d["node_id"])
        node.connections = d["connections"]
        return node
    
#Graph class
# self.nodes: dictionary of nodes in the graph
# add_node(node_id): adds a node to the graph
# to_dict(): converts the graph to a dictionary format for JSON serialization
# from_dict(d): creates a graph from a dictionary format
class Graph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, node_id):
        if node_id not in self.nodes:
            self.nodes[node_id] = Node(node_id)

    def to_dict(self):
        return {
            "nodes": [node.to_dict() for node in self.nodes.values()]
        }
    @staticmethod
    def from_dict(d):
        graph = Graph()

        for node_data in d["nodes"]:
            node = Node.from_dict(node_data)
            graph.nodes[node.node_id] = node

        return graph
    
# Load exisiting graph from json file
def load_graph(filename):
    with open(filename, "r") as f:
        data = json.load(f)
    return Graph.from_dict(data)

# Save graph to json file
def save_graph(graph, filename):
    with open(filename, "w") as f:
        json.dump(graph.to_dict(), f, indent=2)

# Add base node to graph, then prompt user to add more nodes and connections until they choose to stop
def add_nodes(graph):
    print("Nodes will be connected to the base node until you choose to stop adding nodes.\n Input STOP to stop adding nodes.\n")
    base_node_id = input("Enter the base node id: ")
    graph.add_node(base_node_id)
    node_id = ""
    while True:
        while True:
            node_id = input("Enter a node id to connect to the base node (or STOP to stop adding nodes): ")
            if not (node_id == "STOP" or node_id == "stop"):
                graph.nodes[base_node_id].add_connection(node_id) #open the node with the base node id and add a connection to the new node
            else:
                break

        # Once nodes have been added, prompt user to add another base node and repeat the process until they choose to stop
        base_node_id = input("Enter the base node id: ")
        if not (base_node_id == "STOP" or base_node_id == "stop"):
            graph.add_node(base_node_id)
            node_id = ""
        else:
            break


# main loop
print("This script will help you create a node connections json file for graphs\nThe base node will be added as the first node in the json file and all other nodes will be connected to it until you choose to stop.\n")
graph = None
while True:

    selection = input("Select an operation:\n1. Create a new graph\n2. Load an existing graph\n3. Save the current graph and exit\n4. Just exit\n")

    if selection == "1":
        graph = Graph()
        add_nodes(graph)

    if selection == "2":
        filename = input("Enter the filename to load the graph from: ")
        if filename == "cancel":
            continue
        graph = load_graph(filename)
        print(f"Graph loaded from {filename}")
        add_nodes(graph)

    if selection == "3":
        filename = input("Enter the filename to save the graph to: ")
        save_graph(graph, filename)
        print(f"Graph saved to {filename}")
        break

    if selection == "4":
        user_input = input("Are you sure you want to exit without saving? (y/n): ")
        if user_input.lower() in ["y", "yes"]:
            break
