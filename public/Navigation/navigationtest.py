# this is a test file for the python script that will provide navigation


# the graph class will be used to represent the generated class, graph itself is a dictionary of dictionaries
# this graph class itself is more an experimental design as we keep developing it


#class Graph:
#    def __init__(self, graph: dict = {}):
#        self.graph = graph # graph is a dictionary, can also be passed a graph when it starts up but it defaults to a default empty dict
#        #not sure if that should be a colon or a =
#
#    def add_edge(self, node1, node2, weight = 1):
#        if node1 not in self.graph: #checks if the node is already added
#            self.graph[node1] = {} #Creates the node if it isn't already added
#        self.graph[node1][node2] = weight #add a connection to its neighbor
#
#    def shortest_distances(self, source: str):
#        distances = {node: float("inf") for node in self.graph}
#        distances[source] = 0 #Sets the source distance to 0

class Graph:
    def __init__(self, graph = dict()):
        self.graph = graph #graph is a dictionary, it can also be passed a dictionary if another graph object already exists

    def add_edge(self, startingNode, endingNode, distance = 1, knownStart = False):
        # adds an edge to a graph when passed the start, end, and distance, and if it should check if the starting node has been added
        if (knownStart == False):
            if startingNode not in self.graph:
                self.graph[startingNode] = {} #creates the dictionary of connections for that starting node if it didn't already exist
        self.graph[startingNode][endingNode] = distance;

