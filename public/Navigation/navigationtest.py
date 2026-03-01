# this is a test file for the python script that will provide navigation
#imports

from heapq import heapify, heappop, heappush
#these are used for the priority queue


# the graph class will be used to represent the generated class, graph itself is a dictionary of dictionaries
# this graph class itself is more an experimental design as we keep developing it

class Graph:
    def __init__(self, graph = dict()):
        self.graph = graph #graph is a dictionary, it can also be passed a dictionary if another graph object already exists

    def add_edge(self, startingNode, endingNode, distance = 1, knownStart = False):
        # adds an edge to a graph when passed the start, end, and distance, and if it should check if the starting node has been added
        if (knownStart == False):
            if startingNode not in self.graph:
                self.graph[startingNode] = {} #creates the dictionary of connections for that starting node if it didn't already exist
        self.graph[startingNode][endingNode] = distance;

    def shortest_distances(self, sourceNode: str):
        # suggests that sourcenode is an str
        distances = {node: float("inf") for node in self.graph} # Creates a distances dictionary to store the distances from source
        distances[sourceNode] = 0 # sets the source value to 0

        #initialize a priority queue
        searchQueue = [(0,sourceNode)]
        heapify(searchQueue)
        
        #Create a set to hold visited nodes
        visited = set()

        while searchQueue: #runs while search queue is not empty
            current_distance, current_node = heappop(searchQueue) #pops the highest priority, returns a tuple that is split
            #between current_distance and current_node. This node should be on the one with the min distance

            if current_node in visited:
                continue #skip already visited nodes
            
            visited.add(current_node) #adds it to the visited nodes so we don't revist it

            for adjacent, weight in self.graph[current_node].items():
                #goes into the inner dictionary and pulls the adjacent nodes and their values
                calculated_distance = current_distance + weight #distance from source + distance to next node

                if calculated_distance < distances[adjacent]:
                    #if this new route of reaching the location is shorter than the previously recorded path
                    distances[adjacent] = calculated_distance #update the known distance to the more efficent path
                    heappush(searchQueue, (calculated_distance, adjacent)) #adds the new connection and its weight (based on distance from start)


        #calculate shortest path

        predecessors = {node: None for node in self.graph} #creates a dictionary list 
        for node, distance in distances.items():
            for adjacent, weight in self.graph[node].items():
                if distances[adjacent] == distance + weight:
                    predecessors[adjacent] = node
        return distances,predecessors;


#testing code

inputGraph = {'A': {'B': 3, 'C': 3},
              'B': {'A': 3, 'D': 3.5, 'E': 2.8},
              'C': {'A': 3, 'E': 2.8, 'F': 3.5},
              'D': {'B': 3.5, 'E': 3.1, 'G': 10},
              'E': {'B': 2.8, 'C': 2.8, 'D': 3.1, 'G': 7},
              'F': {'G': 2.5, 'C': 3.5},
              'G': {'F': 2.5, 'E': 7, 'D': 10}}

G = Graph(inputGraph)

#G.add_edge("A", "B", 3)
#G.add_edge("A", "C", 3)
#G.add_edge("B", "A", 3)
#G.add_edge("B", "D", 3.5)
#G.add_edge("B", "E", 2.8)


distances, predecessor = G.shortest_distances("B")
print(distances, "\n")

to_F = distances["F"]
print(f"The shortest distance from B to F is {to_F}")

print("\n")
print(predecessor, "\n")