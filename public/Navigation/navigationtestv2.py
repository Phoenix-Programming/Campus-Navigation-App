# this is a test file for the python script that will provide navigation
# this is the v2 version that will handle more complicated routing and inputs

from dataclasses import dataclass
from heapq import heapify, heappop, heappush
#these will be used for the priority queue

class Graph:
    def __init__(self, graph = dict()):
        self.graph = graph #graph is an dictionary, it can be passed a dictionary if another graph object exists

    def add_edge(self, startingNode: str, endingNode: str, distance = 1, direction = '', flags = [0,0,0,0,0,0,0,0,0,0]):
        #leaving known start out of this

        if startingNode not in self.Graph:
            self.graph[startingNode] = dict() # {} works as well, creates a dictionary that will represent the connections for that node if
            # it din't exist before
        self.graph[startingNode][endingNode] = (distance, direction, flags) #the key of ending node in the dictionary of that node has a few
        #pieces of data, including the true distance, the direction (used for routing instruction) and the flags (used for navigation calculations)
 
    def shortest_distances(self, sourceNode: str):
        distances = {node: float("inf") for node in self.graph} #Creates a distances dictionary to store the distance from source
        distances[sourceNode] = 0 #sets the source value to 0
        
        #initalize the priority queue
        searchQueue = [(0, sourceNode)]
        heapify(searchQueue)

        #Creates a set to hold visited nodes (only allows uniques)
        visited = set()

        while searchQueue: #runs while the search queue is not empty
            current_distance, current_node = heappop(searchQueue) #pops the highest priority (lowest distance) returns with a split tuple

            if current_node in visited:
                continue #skip already visited nodes

            visited.add(current_node) #adds it to the visited nodes so we don't revist it

            for adjacent, data in self.graph[current_node].items():
                #goes into the dictionary for the current node and pulls all the edge connections and their data

                #split the tuple up into the data we want
                weight, _, flags = data

                if (flags[0] == True):
                   #consider going up stairs double the weight as traveling on flat ground
                   weight *= 2
                if (flags[1] == True):
                   #consider going down stairs as 1.5x the weight as traveling on flat ground
                   weight *= 1.5

                calculatedWeight = weight + current_distance #considers the distance from root that has already been traveled
                #along with the weight of the next step
                if (calculatedWeight < distances[adjacent]):
                    #if this new route to this particular node is faster than any other known route
                    distances[adjacent] = calculatedWeight
                    heappush(searchQueue,(calculatedWeight, adjacent)) #adds the new connection and its weight to the heappush so its
                    #connections can be checked again
                
        #calculate the shortest path from each node backwards to the root
        predecessors = {node: None for node in self.graph} #creates a dictionary list
        for node, distance in distances.items():
            for adjacent, data in self.graph[node].items():
                weight, _, _ = data #split the tuple 
                if distances[adjacent] == distance + weight:
                    predecessors[adjacent] = node #the predecssor is the node whos path from itself to another node is equal to its distance + its weight on that edge
        return distances, predecessors
        
    def shortest_path(self, sourceNode: str, targetNode: str):
        distances, predecessor = self.shortest_distances(sourceNode) #calls shortest distances to setup the source node there
        #optionaly this could use the same shortest distance calculation several times for different routes but this implementation is fine for testing

        path = []
        current_node = targetNode #start from the end and work backwards
        
        while current_node:
            #while current node exists backtrack
            path.append(current_node)
            current_node = predecessor[current_node]

        path.reverse()

        #handle printing and figuring out directions

        totalDistance = 0
        totalWeight = distances[path[len(path)-1]]

        #for node in path:
        #    _, data in self.graph[node].items()
        #    trueDistance, direction, flags = data #split the tuple

        print(f"Start from {path[0]}")
            
        for i in range(len(path)-1):
            #iterates throught the path
            trueDistance, direction, flags = self.graph[path[i]][path[i+1]]
            totalDistance += trueDistance #adds the true distance to the total distance calculation
            
            directionInstruction = "go to"
            if direction == 'L':
                directionInstruction = "take a left to"
            elif direction == 'R':
                directionInstruction == "take a right to"
            elif direction == 'F':
                directionInstruction == "continue forwards to"
            elif direction == 'U':
                directionInstruction == "go upstairs to"

            print(f"{directionInstruction} {path[i+1]} in : {trueDistance}ft")
        print(f"You have arrived at your destination")
        print(f"Total Distance: {totalDistance} ft")
        print(f"Total Time: {totalWeight} seconds")

#main testing code


G = Graph()
