import { useState, useRef } from 'react'
import './assets/styles.css'

/*

Campus Navigation Project: FPU

enter the directory of the node_connections_editor with cd src/utils/node_connections_editor
run with npm run dev

This is the main code for the node_connections_editor. 
It allows users to upload an SVG file and a JSON file, and then displays the SVG file in a viewer.
The viewer supports panning and zooming using the middle mouse button and scroll wheel, respectively.

WIP features:
- The JSON file will be used to add all nodes to the svg as circles and add events to create edges between nodes by clicking on them.



*/

export default function App() {
    const [svg, setSvg] = useState(null); //saves url to svg to display
    const [json, setJson] = useState(null); //json object from parsed json

    const [hoveredNode, setHoveredNode] = useState(null); //state to keep track of which node is currently being hovered over (for overlay info)
    const [selectedNode, setSelectedNode] = useState(null); //state to keep track of which node is currently selected (for edge creation)
    const [secondSelectedNode, setSecondSelectedNode] = useState(null); //state to keep track of the second node selected for edge creation

    const [connections, setConnections] = useState([]); //array of objects for connections between nodes, each object has the format { id: string, connections: string[] }

    function setSelect(node) {
        setSelectedNode(prev => {
            if (prev && prev.id === node.id) {
                setSecondSelectedNode(null);
                return null;
            }
            
            setSecondSelectedNode(prev);
            return node;
    });
}
  return (
    <div>
        {/*display the upload component*/}
        <Upload setSvg={setSvg} setJson={setJson}/>

        {json && svg && <SVGViewer src={svg} json={json} setHoveredNode={setHoveredNode} setSelectedNode={setSelect} selectedNode={selectedNode} secondSelectedNode={secondSelectedNode} />} {/*display the SVG viewer if both files have been uploaded*/}

        {json && svg && <Overlay selectedNode={selectedNode} secondSelectedNode={secondSelectedNode} hoveredNode={hoveredNode}/>}
    </div>
  )
}


//Component for handling file uploads and displaying instructions to the user
//hides itself once both files have been uploaded and passes both files to the parent component (App) through the setSvg and setJson functions
function Upload({ setSvg, setJson }) {
    const [uplState, setUplState] = useState(0);

    function handleChange(e) {
        const f = e.target.files[0];

        if (f.type === "application/json") { //check if the uploaded file is a JSON
          f.text().then(text => {
            const data = JSON.parse(text);
            setJson(data);
            console.log(data);

          if (uplState === 2){ //if the svg file has already been uploaded, set the state to 3 to indicate that both files have been uploaded
            setUplState(3);
          }
          else if (uplState === 0) {
            setUplState(1); //set state to 1 to indicate that the JSON file has been uploaded
          }
          return;
          });
        }
        else if (f.type === "image/svg+xml") {
          setSvg(URL.createObjectURL(f));
          if (uplState === 1){ //if the json file has already been uploaded, set the state to 3 to indicate that both files have been uploaded
            setUplState(3);
          }
          else if (uplState === 0) {
            setUplState(2); //set state to 2 to indicate that the SVG file has been uploaded
          }
          return;
        }
        else {
          alert("Please upload a valid SVG or JSON file.");
          return;
        }
    }

    return (
        <div>
            {uplState !== 3 &&
            <div className='instructions'>
                <p>Upload a JSON file containing the graph data and an SVG file containing the graph visualization.</p>
                <p>Use the middle mouse button to pan around the SVG and the scroll wheel to zoom in and out.</p>
            </div>}
            <div className="upload">
            {uplState !== 3 && (
                <label className="uploadBtn">
                    {uplState === 0 || uplState === 1 ? "Upload SVG" : "SVG Uploaded"}
                    <input type="file" accept=".svg" onChange={handleChange} />
                </label>
            )}
            {uplState !== 3 && (
                <label className="uploadBtn">
                    {uplState === 0 || uplState === 2 ? "Upload JSON" : "JSON Uploaded"}
                    <input type="file" accept=".json" onChange={handleChange} />
                </label>
            )}
            </div>
            
        </div>
    );
}

//Component for displaying the uploaded SVG file and handling panning and zooming interactions
function SVGViewer({ src , json, setHoveredNode, setSelectedNode, selectedNode, secondSelectedNode }) {
    const [scale, setScale] = useState(0.1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const last = useRef({ x: 0, y: 0 });

    function onWheel(e) { //event for zooming in and out
        e.preventDefault();

        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;

        setScale(prev => Math.min(Math.max(0.1, prev + delta), 5));
    }

    function onMouseDown(e) { //event called to detect dragging for panning the image
        if (e.button !== 1) return; //only respond to middle mouse button

        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseMove(e) { //event for panning the image while dragging
        if (!dragging.current) return;

        const dx = e.clientX - last.current.x; //calculate the change in x and y positions
        const dy = e.clientY - last.current.y;

        last.current = { x: e.clientX, y: e.clientY };

        setPos(prev => ({
            x: prev.x + dx,
            y: prev.y + dy
        }));
    }

    function onMouseUp() { //event to stop dragging when mouse button is released
        dragging.current = false;
    }

    return (
        <div
            className="viewer"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            <div className="svgContainer" style={{
                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, //apply both translation and scaling to the image
                    transformOrigin: "center", //set the origin for scaling to the center of the image
                    userSelect: "none", //prevent text selection while dragging
                    position: "relative"
                }}>
            <img
                src={src} //display the uploaded SVG image
                alt="svg"
                draggable={false}
            />
            <Nodes json={json} setHoveredNode={setHoveredNode} setSelectedNode={setSelectedNode} selectedNode={selectedNode} secondSelectedNode={secondSelectedNode}/>
            </div>
        </div>
    );
}

function Nodes({ json, setHoveredNode, setSelectedNode, selectedNode, secondSelectedNode }) {
    const scale = 37.65; //scale factor to convert from cm to pixels (1 cm = 37.7952755906 pixels)
    
    const colors = {
        rm: "#262AFF",
        hall: "#21FF37",
        rmdoor: "#FF2626",
        stair: "#FFA500",
    };

    function onNodeClick(node) {
        setSelectedNode(node);
    }

    return (
        <div>
            {json.map((node) => {
            const color = colors[node.type] ?? "#000000";
            const getBorder = () => {
                if (selectedNode?.id === node.id) return "5px solid #ffff00";
                if (secondSelectedNode?.id === node.id) return "5px solid #00ffff";
                return "none";
            };

            return (
                <div
                key={node.id}
                className="node"
                style={{
                    width: 100,
                    height: 100,
                    backgroundColor: color,
                    position: "absolute",
                    cursor: "pointer",
                    left: node.x * scale * 1.00001,
                    top: node.y * scale * 0.9984,
                    borderRadius: "50%",

                    border: getBorder()
                }}
                onClick={() => onNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => {console.log("Mouse left node"); setHoveredNode(null);}}
                />
            );
            })}
        </div>
        );
}

//Component for managing and displaying the overlay
function Overlay({selectedNode, secondSelectedNode, hoveredNode}){
    return (

        <div className = "overlay">
            <div className='connectionsBtn'>
                Add connection
            </div>
            <br></br>
            <div className='connectionsBtn'>
                Remove connection
            </div>
            {secondSelectedNode &&
            <>
                <h1>Selected Node</h1>
                <div>
                ID: {secondSelectedNode.id}
                <br />
                Type: {secondSelectedNode.type}
                <br />
                Role: {secondSelectedNode.role}
                </div></>
                }
            {selectedNode &&
            <>
                <h1>Selected Node</h1>
                <div>
                ID: {selectedNode.id}
                <br />
                Type: {selectedNode.type}
                <br />
                Role: {selectedNode.role}
                </div></>
                }
            {hoveredNode && hoveredNode != selectedNode &&
            <>
                <h1>Hovering over</h1>
                <div>
                ID: {hoveredNode.id}
                <br />
                Type: {hoveredNode.type}
                <br />
                Role: {hoveredNode.role}
                </div></>
                }
        </div>
    )
}