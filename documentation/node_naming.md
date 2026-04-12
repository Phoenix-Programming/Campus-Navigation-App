# Node Naming Conventions

The following naming convention for nodes should be followed consistently across all nodes for all buildings to allow for them to be easily identified, unique, and easily updated.

## Naming Convention

* **Rooms:** (ist | barc | p1 | etc.)\_rm\_####[A | B | C | D]\_f#
* **Room Doors:** (ist | barc | p1 | etc.)\_rmdoor\_#\_####[A | B | C | D]\_f#
* **Hallways:** (ist | barc | p1 | etc.)\_hall\_(n-s | e-w)\_([a-z])\_#\_f#
* **Other:** (ist | barc | p1 | etc.)\_(entrance | exit | elevator | stairs | vending | fountain | desk | etc.)\_(north | south | east | west)\_#\_f#

### Where

* ist, barc, p1, etc. represent the building acronym
* rm stands for room
* rmdoor stands for room door
* hall stands for hallway
* \#\#\#\#[A | B | C | D] represents the room number with an optional letter suffix for rooms that have one or more subrooms (e.g., 1001, 1001A, 1001B, etc.).
* (n-s | e-w) represents the direction the hallway runs (north-south or east-west).
* ([a-z])\_# represents a unique identifier for the hallway node, with the letter indicating the specific hallway and the number indicating the node's position along that hallway.
* f# represents the floor number (e.g., f1 for the first floor, f2 for the second floor, etc.).

## Examples

* **Room:** ist\_rm\_1002A\_f1 (Room 1002A in the IST building on the 1st floor)
* **Room Door:** barc\_rmdoor\_1\_2202B\_f2 (Door 1 of Room 2202B in the BARC building on the 2nd floor)
* **Hallway:** p1\_hall\_n-s\_a\_3\_f1 (Hallway running north-south in the Phase 1 building on the 1st floor, with a unique identifier 'a' indicating it is either the closest parallel hallway to the main entrance or the rightmost perpendicular hallway, and a unique identifier of 3 indicating it is the 3rd node in that hallway)
* **Other:** ist\_elevator\_north\_2\_f1 (Elevator 2 located on the north side of the IST building on the 1st floor)

## Notes

* Unique identifiers for hallways should be assigned sequentially (e.g., a, b, c, etc.) based on their position relative to the main entrance.
  * They should start with 'a' for the closest parallel hallway to the main entrance and continue alphabetically as you move through the building.
  * For hallways perpendicular to the main entrance, the unique identifiers should start with 'a' on the right side (from the perspective of someone entering the building) and continue alphabetically as you move to the left.
* Unique identifiers for hallway nodes should be assigned sequentially (e.g., 1, 2, 3, etc.) based on their position along the hallway, starting from the end closest to the main entrance for perpendicular hallways and from the rightmost end for parallel hallways.
