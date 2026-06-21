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
        if other_node_id not in self.connections:
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
        # Create node if it doesn't exist
        if node_id not in self.nodes:
            self.nodes[node_id] = Node(node_id)

        parts = node_id.split("_")

        if parts[1] == "rmdoor": # if the node is an rmdoor, create a corresponding rm node and connect them
            new_id = f"{parts[0]}_rm_{parts[3]}_{parts[4]}"

            if new_id not in self.nodes:
                self.nodes[new_id] = Node(new_id)
                print(f"rm Node {new_id} created for corresponding rmdoor node {node_id}")

            self.nodes[new_id].add_connection(node_id)
            self.nodes[node_id].add_connection(new_id)

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
    

# Check all connections and ensure that they are both ways (if node A is connected to node B, then node B should also be connected to node A)
# if they are not, create the missing connection and print a message indicating that the connection was added
def check_connections(graph):
    for node in graph.nodes.values():
        for connected_node_id in node.connections:
            if connected_node_id in graph.nodes:
                connected_node = graph.nodes[connected_node_id]
                if node.node_id not in connected_node.connections:
                    connected_node.add_connection(node.node_id)
                    print(f"Connection added from {connected_node_id} to {node.node_id}")

#Creates nodes for connections that are referenced but not defined in the graph, and prints a message indicating that the node was created
def create_missing_nodes(graph):
    missing = set()

    for node in graph.nodes.values():
        for connected_node_id in node.connections:
            if connected_node_id not in graph.nodes:
                missing.add(connected_node_id)

    for node_id in missing:
        graph.add_node(node_id)
        print(f"Node {node_id} created because it was referenced in connections but not defined in the graph.")

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
    print("Nodes will be connected to the base node until you choose to stop adding nodes.\n Nodes will be added if referenced, so create all hall chains first, then use rmdoors as base nodes and connect them to the hall nodes, then add any other nodes and connections as needed. rmdoors will automatically be connected to their respective rm node.\n")
    while True:
        choice = input("Enter the base node id to connect and add nodes, hall for creating a hall chain, or STOP to stop adding nodes: ")
        if choice.lower() == "hall": # help create a sequential chain of nodes for a hall
            print("Example hall node id parameters: \tist_hall_e-w_e_1_f1 \n\t\t ist_hall_e-w are the first three node identifiers for the hall including the underscores \n\t\t e is the last letter of the hall node count identifier \n\t\t 1 is the number for the designation \n\t\t f1 is the suffix for the hall nodes after the count identifier")
            hall_base = input("Enter the starting three node identifiers for the hall including the underscores (EG: ist_hall_e-w): ")
            hall_count = (input("Enter the last letter of the hall node count identifier: "))
            if hall_count.isalpha() and len(hall_count) == 1:
                hall_count = ord(hall_count) - ord('a') + 1
            else:
                print("Invalid input for hall count identifier.")
                return
            hall_suffix = input("Enter the suffix for the hall nodes after the count identifier: (EG: 2_f1): ")

            for i in range(1, hall_count + 1): # create the chain of nodes for the hall and add connections between them
                node_id = f"{hall_base}_{chr(ord('a') + i - 1)}_{hall_suffix}"
                graph.add_node(node_id)
                print(f"Node {node_id} added to graph.")
                if i > 1:
                    graph.nodes[node_id].add_connection(f"{hall_base}_{chr(ord('a') + i - 2)}_{hall_suffix}") # add connection to previous node
                    graph.nodes[f"{hall_base}_{chr(ord('a') + i - 2)}_{hall_suffix}"].add_connection(node_id) # add reverse connection
            print(f"Hall chain of {hall_count} nodes created and connected.")


        elif not (choice.lower() == "stop"):
            graph.add_node(choice)
            node_id = ""
            base_node_id = choice
            while True:
                while True:
                    node_id = input("Enter a node id to connect to %s (or STOP to stop adding connections): " % base_node_id)
                    if not (node_id.lower() == "stop"):
                        graph.nodes[base_node_id].add_connection(node_id) #open the node with the base node id and add a connection to the new node
                    else:
                        break

                # Once nodes have been added, prompt user to add another base node and repeat the process until they choose to stop
                base_node_id = input("Enter the base node id: ")
                if not (base_node_id.lower() == "stop"):
                    graph.add_node(base_node_id)
                    node_id = ""
                else:
                    break
        else:
            break
    #once out of the loop, ask to perform a check to create missing nodes that are referenced, and make sure all connections are both ways
    if input("Do you want to check for missing nodes and connections? (y/n): ").lower() in ["y", "yes"]:
        create_missing_nodes(graph)
        check_connections(graph)
    



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
