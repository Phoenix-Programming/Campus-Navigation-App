#!/usr/bin/env python3
"""
Convert SVG circles/ellipses to JSON graph nodes.
Parses SVG file, extracts nodes by inkscape:label, calculates absolute coordinates,
and generates JSON objects in the required format.
"""

import xml.etree.ElementTree as ET
import re
import json
from typing import List, Dict, Tuple, Optional
from collections import defaultdict


def parse_transform(transform_str: Optional[str]) -> Tuple[float, float, float, float, float, float]:
    """
    Parse SVG transform string and return transformation matrix.
    Returns (a, b, c, d, e, f) for matrix(a, b, c, d, e, f).
    Handles translate, scale, and matrix transforms.
    """
    if not transform_str:
        return (1, 0, 0, 1, 0, 0)  # Identity matrix
    
    # Extract translate values
    translate_match = re.search(r'translate\(([^,]+),([^)]+)\)', transform_str)
    if translate_match:
        tx = float(translate_match.group(1))
        ty = float(translate_match.group(2))
        return (1, 0, 0, 1, tx, ty)
    
    # Extract matrix values
    matrix_match = re.search(r'matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)', transform_str)
    if matrix_match:
        return tuple(float(matrix_match.group(i)) for i in range(1, 7))
    
    # Extract scale values
    scale_match = re.search(r'scale\(([^,)]+)(?:,([^)]+))?\)', transform_str)
    if scale_match:
        sx = float(scale_match.group(1))
        sy = float(scale_match.group(2)) if scale_match.group(2) else sx
        return (sx, 0, 0, sy, 0, 0)
    
    return (1, 0, 0, 1, 0, 0)  # Identity matrix


def multiply_matrices(m1: Tuple[float, ...], m2: Tuple[float, ...]) -> Tuple[float, float, float, float, float, float]:
    """Multiply two transformation matrices."""
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1
    )


def apply_transform(x: float, y: float, matrix: Tuple[float, ...]) -> Tuple[float, float]:
    """Apply transformation matrix to a point."""
    a, b, c, d, e, f = matrix
    new_x = a * x + c * y + e
    new_y = b * x + d * y + f
    return (new_x, new_y)


def get_absolute_coordinates(element: ET.Element, parent_transform: Tuple[float, ...] = (1, 0, 0, 1, 0, 0)) -> Tuple[float, float]:
    """
    Get absolute coordinates of a circle/ellipse element, accounting for all parent transforms.
    """
    # Get current element's transform
    transform_str = element.get('transform', '')
    current_transform = parse_transform(transform_str)
    
    # Combine with parent transform
    combined_transform = multiply_matrices(parent_transform, current_transform)
    
    # Get coordinates (cx, cy for circles, or cx, cy for ellipses)
    cx = float(element.get('cx', '0'))
    cy = float(element.get('cy', '0'))
    
    # Apply transform
    abs_x, abs_y = apply_transform(cx, cy, combined_transform)
    
    return (abs_x, abs_y)


def collect_elements_with_transforms(element: ET.Element, parent_transform: Tuple[float, ...] = (1, 0, 0, 1, 0, 0), 
                                     results: List[Tuple[ET.Element, Tuple[float, ...]]] = None) -> List[Tuple[ET.Element, Tuple[float, ...]]]:
    """
    Recursively collect all circle and ellipse elements with their accumulated transforms.
    """
    if results is None:
        results = []
    
    # Get current element's transform
    transform_str = element.get('transform', '')
    current_transform = parse_transform(transform_str)
    combined_transform = multiply_matrices(parent_transform, current_transform)
    
    # Check if this is a circle or ellipse
    tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag
    if tag in ['circle', 'ellipse']:
        results.append((element, combined_transform))
    
    # Recursively process children
    for child in element:
        collect_elements_with_transforms(child, combined_transform, results)
    
    return results


def determine_node_type(label: str) -> Optional[str]:
    """
    Determine node type from inkscape:label.
    Returns: 'hall', 'room', 'door', 'elevator', or None
    """
    label_lower = label.lower()
    
    # Elevators
    if 'elevator' in label_lower:
        return 'elevator'
    
    # Entrances/Exits (treated as doors)
    if 'entry' in label_lower or 'entrance' in label_lower or 'exit' in label_lower:
        return 'door'
    
    # Doors (room doors)
    if '_door' in label_lower:
        return 'door'
    
    # Hallways
    if 'hallway' in label_lower or 'hall' in label_lower or label_lower in ['centerhallway', 'mosaiccafe']:
        return 'hall'
    
    # Rooms (must start with 'room' and not contain '_door')
    if label_lower.startswith('room') and '_door' not in label_lower:
        return 'room'
    
    return None


def generate_node_id(label: str, node_type: str) -> str:
    """
    Generate node ID from label and type according to the format requirements.
    """
    label_lower = label.lower()
    
    if node_type == 'hall':
        # Hallways: convert "northHallway1" -> "hall_n-s_a_1", etc.
        # This is a simplified mapping - you may need to adjust based on actual labels
        if 'northhallway' in label_lower:
            num = re.search(r'(\d+)', label)
            num_str = num.group(1) if num else '1'
            return f"hall_n-s_a_{num_str}"
        elif 'southhallway' in label_lower:
            num = re.search(r'(\d+)', label)
            num_str = num.group(1) if num else '1'
            return f"hall_n-s_b_{num_str}"
        elif 'easthallway' in label_lower:
            num = re.search(r'(\d+)', label)
            num_str = num.group(1) if num else '1'
            return f"hall_e-w_c_{num_str}"
        elif 'westhallway' in label_lower:
            num = re.search(r'(\d+)', label)
            num_str = num.group(1) if num else '1'
            return f"hall_e-w_d_{num_str}"
        elif label_lower == 'centerhallway':
            return "hall_center_1"
        elif label_lower == 'mosaiccafe':
            return "hall_mosaic_1"
        else:
            # Fallback: use label as-is but sanitize
            return f"hall_{label_lower.replace(' ', '_')}"
    
    elif node_type == 'room':
        # Rooms: "room1000" -> "rm_1000", "room1051A" -> "rm_1051A", "room1007_room1" -> "rm_1007"
        # Handle patterns like "room1007_room1" by extracting just the room number
        room_match = re.search(r'room(\d+[A-Za-z]?)(?:_room\d+)?', label, re.IGNORECASE)
        if room_match:
            room_num = room_match.group(1)
            return f"rm_{room_num}"
        return f"rm_{label_lower.replace('room', '').replace(' ', '_')}"
    
    elif node_type == 'door':
        # Doors: "room1000_door1" -> "rm_1000_door1"
        # Entrances: "northEntry" -> "entrance_north"
        # Exits: "exit_east" -> "exit_east"
        
        if 'entry' in label_lower or 'entrance' in label_lower:
            # Extract direction
            if 'north' in label_lower:
                return "entrance_north"
            elif 'south' in label_lower:
                return "entrance_south"
            elif 'east' in label_lower:
                return "entrance_east"
            elif 'west' in label_lower:
                return "entrance_west"
            else:
                return f"entrance_{label_lower.replace('entry', '').replace('entrance', '').strip('_')}"
        
        if 'exit' in label_lower:
            # Extract direction
            if 'north' in label_lower:
                return "exit_north"
            elif 'south' in label_lower:
                return "exit_south"
            elif 'east' in label_lower:
                return "exit_east"
            elif 'west' in label_lower:
                return "exit_west"
            else:
                return f"exit_{label_lower.replace('exit', '').strip('_')}"
        
        # Room doors: "room1000_door1" -> "rm_1000_door1", "room1051A_door1" -> "rm_1051A_door1"
        door_match = re.search(r'room(\d+[A-Za-z]?)_door(\d+)', label, re.IGNORECASE)
        if door_match:
            room_num = door_match.group(1)
            door_num = door_match.group(2)
            return f"rm_{room_num}_door{door_num}"
        
        return f"door_{label_lower.replace(' ', '_')}"
    
    elif node_type == 'elevator':
        # Elevators: "elevator" -> "elevator_south_f1" (need to determine location)
        # This is simplified - you may need to adjust based on actual labels
        if 'north' in label_lower:
            return "elevator_north_f1"
        elif 'south' in label_lower:
            return "elevator_south_f1"
        elif 'east' in label_lower:
            return "elevator_east_f1"
        elif 'west' in label_lower:
            return "elevator_west_f1"
        else:
            return "elevator_1_f1"  # Fallback
    
    return label_lower.replace(' ', '_')


def extract_room_number(node_id: str) -> Tuple[int, int]:
    """
    Extract room number for sorting purposes.
    Returns (room_num, door_num) where door_num is 0 for non-doors.
    """
    # Rooms: "rm_1000" -> (1000, 0), "rm_1051A" -> (1051, 0)
    room_match = re.search(r'rm_(\d+[A-Za-z]?)(?:_door(\d+))?$', node_id)
    if room_match:
        room_str = room_match.group(1)
        # Extract numeric part
        room_num_match = re.search(r'(\d+)', room_str)
        room_num = int(room_num_match.group(1)) if room_num_match else 0
        door_num = int(room_match.group(2)) if room_match.group(2) else 0
        return (room_num, door_num)
    return (0, 0)


def sort_key(node: Dict) -> Tuple[int, str, int, int]:
    """
    Generate sort key for nodes according to ordering rules:
    1. Hallways first
    2. Rooms (by room number)
    3. Doors (by room number, then door number)
    4. Entrances/Exits
    5. Elevators
    """
    node_id = node['id']
    node_type = node['type']
    
    # Type priority: hall=1, room=2, door=3, elevator=4
    if node_type == 'hall':
        return (1, node_id, 0, 0)
    elif node_type == 'room':
        room_num, _ = extract_room_number(node_id)
        return (2, node_id, room_num, 0)
    elif node_type == 'door':
        if node_id.startswith('entrance_') or node_id.startswith('exit_'):
            # Entrances/exits come after regular doors
            return (3, node_id, 999999, 0)
        room_num, door_num = extract_room_number(node_id)
        return (3, node_id, room_num, door_num)
    elif node_type == 'elevator':
        return (4, node_id, 0, 0)
    else:
        return (5, node_id, 0, 0)


def svg_to_graph_nodes(svg_path: str, floor: int = 1) -> List[Dict]:
    """
    Parse SVG file and extract graph nodes from circles/ellipses.
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    
    # Collect all circle and ellipse elements with their transforms
    elements_with_transforms = collect_elements_with_transforms(root)
    
    nodes = []
    seen_ids = {}  # Track IDs and their counts to handle duplicates
    
    for element, transform in elements_with_transforms:
        # Get inkscape:label
        label = element.get('{http://www.inkscape.org/namespaces/inkscape}label', '')
        if not label:
            continue
        
        # Determine node type
        node_type = determine_node_type(label)
        if not node_type:
            continue
        
        # Get absolute coordinates
        x, y = get_absolute_coordinates(element, transform)
        
        # Generate node ID
        node_id = generate_node_id(label, node_type)
        
        # Handle duplicate IDs by appending a suffix
        if node_id in seen_ids:
            seen_ids[node_id] += 1
            node_id = f"{node_id}_{seen_ids[node_id]}"
        else:
            seen_ids[node_id] = 0
        
        # Determine role
        role = "destination" if node_type == 'room' else "routing"
        
        # Create node object
        node = {
            "id": node_id,
            "type": node_type,
            "floor": floor,
            "x": round(x, 8),
            "y": round(y, 8),
            "role": role
        }
        
        nodes.append(node)
    
    # Sort nodes
    nodes.sort(key=sort_key)
    
    return nodes


def format_output(nodes: List[Dict]) -> str:
    """
    Format nodes as JSON objects separated by newlines, grouped by type.
    """
    output_lines = []
    current_type = None
    
    for node in nodes:
        # Add newline between different types
        if current_type and current_type != node['type']:
            output_lines.append('')
        current_type = node['type']
        
        # Format as JSON (without trailing comma)
        output_lines.append(json.dumps(node, separators=(', ', ':')))
    
    return '\n'.join(output_lines)


def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python svg_to_graph.py <svg_file> [floor_number]")
        sys.exit(1)
    
    svg_path = sys.argv[1]
    floor = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    try:
        nodes = svg_to_graph_nodes(svg_path, floor)
        output = format_output(nodes)
        print(output)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

