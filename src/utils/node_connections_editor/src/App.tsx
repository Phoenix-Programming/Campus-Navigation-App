import { useState, useRef} from 'react'
import './assets/styles.css'

import { useGlobalKeydown } from './globalKeydown.tsx'
/*

Campus Navigation Project: FPU

install dependencies with npm install in the node_connections_editor directory


enter the directory of the node_connections_editor and run with
cd src/utils/node_connections_editor
npm run dev

This is the main code for the node_connections_editor. 
It allows users to upload an SVG file and a JSON file, and then displays the SVG file in a viewer.
The viewer supports panning and zooming using the middle mouse button and scroll wheel, respectively.
The JSON file will be used to add all nodes to the svg as circles and add events to create edges between nodes by clicking on them.
Connections can be exported or imported to continue saved work

Keyboard shortcuts are available,
E to create a connection between two selected nodes
Q to remove a connection between two selected nodes
Ctrl + Z to undo the last connection change

WIP features:
- add custom connection (add a connection to a node that doesn't exist on this svg)
- prompt to auto connect hallway nodes and room nodes
*/

export default function App() {
    const [svg, setSvg] = useState(null); //saves url to svg to display
    const [json, setJson] = useState(null); //json object from parsed json
    const [fileName, setFileName] = useState(null) //name of json object 

    const [hoveredNode, setHoveredNode] = useState(null); //state to keep track of which node is currently being hovered over (for overlay info)
    const [selectedNode, setSelectedNode] = useState(null); //state to keep track of which node is currently selected (for edge creation)
    const [secondSelectedNode, setSecondSelectedNode] = useState(null); //state to keep track of the second node selected for edge creation

    const [edges, setConnections] = useState([]); //array of objects for connections between nodes, each object has the format { id: string, connections: string[] }

    const keyRef = useRef(false); //state to keep track of the previously pressed keys for keyboard shortcuts

    const [history, setHistory] = useState([]); //state to keep track of the history of connections for undo functionality

    const createConnection = () => {
        console.log("selected:", selectedNode);
        console.log("second:", secondSelectedNode);
        if (!selectedNode || !secondSelectedNode) return;

        const id1 = selectedNode.id;
        const id2 = secondSelectedNode.id;

        // Save the current state to history
        pushHistory();

        setConnections(prev => {
            let updated = structuredClone(prev); //copy edges

            const addConnection = (from, to) => {
                const existing = updated.find(e => e.id === from); //find object with matching id

                if (existing) { //if it exists
                    if (!existing.connections.includes(to)) { // if it doesn't include the connection already
                        existing.connections.push(to); //add the connection to it
                    }
                } else {
                    updated.push({ id: from, connections: [to] }); // if it doesn't exist, add a whole object to the array
                }
            };

            // make it bidirectional
            addConnection(id1, id2);
            addConnection(id2, id1);

            return updated;
        });
    };

    const removeConnection = () => {
        if (!selectedNode || !secondSelectedNode) return;

        const id1 = selectedNode.id;
        const id2 = secondSelectedNode.id;

        // Save the current state to history
        pushHistory();

        setConnections(prev => { //this is a function call
            return prev.map(conn => { // for all connections in edges
                if (conn.id === id1) {
                    return {
                        ...conn,
                        connections: conn.connections.filter(c => c !== id2) //keep all connections that do not have id2
                    };
                }

                if (conn.id === id2) {
                    return {
                        ...conn,
                        connections: conn.connections.filter(c => c !== id1) //keep all connections that do not have id1
                    };
                }

                return conn;
            });
        });
    };

    const forceConnection = (id1, id2) => { //WIP
        if (id2 != null){console.log("Error, tried to force regular connection");return;}
        else{
            console.log("Forcing connection to node");
        }
        
    };

    const setSelect = (node) => {
        setSelectedNode(prev => {
            if (prev && prev.id === node.id) {
                setSecondSelectedNode(null);
                return null;
            }
            
            setSecondSelectedNode(prev);
            return node;
        });
    };

    //function to import new edge data and replace the current data
    const importConnections = (data) => { // data is array of node objects, with string id and array of connections
        console.log("current edge data")
        console.log(edges);
        console.log("importing data")
        console.log(data);
        setConnections(data);
    }

    //function to export all edge data and include distance for all connections
    async function exportConnections() {
        const nodes = {nodes: edges}; //wrap it in object for python scripts... because we did that

        const jsonString = JSON.stringify(nodes, null, 2); //turn edges into a json string

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${fileName}connections.json`,
                    types: [{
                        description: "JSON Connection File",
                        accept: {
                            "application/json": [".json"]
                        }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === "AbortError") return;
                throw err;
            }
        }

        // Fallback download (for macs or firefox)
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    useGlobalKeydown((e) => {
        console.log("Pressed keys:", e.pressedKeys);
        if (e.pressedKeys.length === 0) { //reset if no keys are pressed
            keyRef.current = false;
            console.log("Keys released, resetting keyRef");
            return;
            }
        if (e.pressedKeys.length === 1 && (e.pressedKeys.includes("Control") || e.pressedKeys.includes("Alt") || e.pressedKeys.includes("shift"))){ //ignore if only modifier keys are pressed
            keyRef.current = false;
            console.log("Keys released, resetting keyRef");
            return;
        }
        if (keyRef.current) return; //prevent repeat events if keys are held down
        

        if (e.pressedKeys.includes("e")){
            console.log("Adding connection");
            createConnection();
            keyRef.current = true;
        }
        else if (e.pressedKeys.includes("q")){
            console.log("Removing connection");
            removeConnection();
            keyRef.current = true;
        }
        else if (e.pressedKeys.includes("Control") && e.pressedKeys.includes("z")) {
            console.log("Undo last connection (WIP)");
            
            setHistory(prevHistory => {
                if (prevHistory.length === 0) return prevHistory; //if there is no history, do nothing

                const previousState = prevHistory[prevHistory.length - 1]; //get the last state from history

                setConnections(previousState); //set edges to the state

                return prevHistory.slice(0, -1); //remove last state
            });
            keyRef.current = true;
        
    }
    });

    const pushHistory = () => {
        setHistory(prev => [...prev, structuredClone(edges)]);
    };

  return (
    <div>
        {/*display the upload component*/}
        <Upload setSvg={setSvg} setJson={setJson} setFileName={setFileName}/>

        {/*display the SVG viewer and overlays if both files have been uploaded*/}
        {json && svg && 
        <>
        <SVGViewer src={svg} json={json} setHoveredNode={setHoveredNode} setSelectedNode={setSelect} selectedNode={selectedNode} secondSelectedNode={secondSelectedNode} connections = {edges}/>
        
        <NodeOverlay selectedNode={selectedNode} secondSelectedNode={secondSelectedNode} hoveredNode={hoveredNode} createConnection = {createConnection} removeConnection = {removeConnection}/>
        
        <ConnectionsOverlay edges = {edges} importConnections={importConnections} exportConnections={exportConnections}/>
        
        <AutoFill edges = {edges} createConnection={createConnection}/>
        </>
        } 
    </div>
  )
}


//Component for handling file uploads and displaying instructions to the user
//hides itself once both files have been uploaded and passes both files to the parent component (App) through the setSvg and setJson functions
function Upload({ setSvg, setJson, setFileName }) {
    const [uplState, setUplState] = useState(0);

    function handleChange(e) {
        const f = e.target.files[0];
        const baseName = f.name.replace(/\.json$/i, "");


        if (f.type === "application/json") { //check if the uploaded file is a JSON
          f.text().then(text => {
            const data = JSON.parse(text);
            setJson(data);
            setFileName(baseName);
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
function SVGViewer({ src , json, setHoveredNode, setSelectedNode, selectedNode, secondSelectedNode, connections}) {
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
            <Nodes json={json} setHoveredNode={setHoveredNode} setSelectedNode={setSelectedNode} selectedNode={selectedNode} secondSelectedNode={secondSelectedNode} connections={connections}/>
            </div>
        </div>
    );
}

function Nodes({ json, setHoveredNode, setSelectedNode, selectedNode, secondSelectedNode, connections }) {
    const scale = 37.65; //scale factor to convert from cm to pixels (1 cm = 37.7952755906 pixels)
    
    const nodesById = Object.fromEntries(
        json.map(node => [node.id, node])
    );

    const colors = {
        rm: "#262AFF",
        hall: "#21FF37",
        rmdoor: "#FF2626",
        stair: "#FFA500",
    };

    //A connection is a object, containing id and connections[]
    const edges = connections.flatMap(conn => //for each connection, create a edge for each connection inside it
        conn.connections.map(targetId => ({ //targetId is each string inside the connections[] array inside the connection
            from: conn.id,
            to: targetId
        }))
    );

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

                    border: getBorder(),
                    zIndex: 1,
                }}
                onClick={() => onNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => {console.log("Mouse left node"); setHoveredNode(null);}}
                />
            );
            })}



            {edges.map((edge) => { //for each edge
                const from = nodesById[edge.from]; //grab the object of the node
                const to = nodesById[edge.to];

                if (!from || !to) return null; //if either don't exist, don't render

                const dx = (to.x - from.x) * scale * 1.00001;
                const dy = (to.y - from.y) * scale * 0.9984;

                const length = Math.sqrt(dx * dx + dy * dy); //trig
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                    <div
                        key={`${edge.from}-${edge.to}`}
                        style={{
                            position: "absolute",
                            left: from.x * scale * 1.00001 +55 ,
                            top: from.y * scale * 0.999 +50,
                            width: length,
                            height: 10,
                            backgroundColor: "#50928d",
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: "0 0",
                            pointerEvents: "none",
                            zIndex: 0,
                        }}
                    />
                );
            })}
        </div>
        );
}

//Component for managing and displaying the node management overlay
function NodeOverlay({selectedNode, secondSelectedNode, hoveredNode, createConnection, removeConnection}){
    return (
        
        <div className = "overlay">
            <div className='connectionsBtn' onClick={createConnection}>
                Add connection
            </div>
            <br></br>
            <div className='connectionsBtn' onClick={removeConnection}>
                Remove connection
            </div>
            {secondSelectedNode &&
            <>
                <h1>Selected Node</h1>
                <div>
                ID: <div className = "info">{secondSelectedNode.id}</div>
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

//Component for managing and displaying the connections json overlay
function ConnectionsOverlay({edges, importConnections, exportConnections}){

    const [nConnections, setnConnections] = useState(null); //number of connections loaded WIP

    function handleChange(e){
        const f = e.target.files[0]
        if (f.type === "application/json"){
            f.text().then(text => {
                const data = JSON.parse(text);
                importConnections(data.nodes);
                console.log(data.nodes);
                setnConnections(data.nodes.length);
            });
        }
    }

    return (
        <div className='connectionsOverlay'>
            <div className='connectionsBtn' onClick={exportConnections}>
                Save connections as Json
            </div>
            <br></br>
            <label className='connectionsBtn'> {/*Button to upload json of connections*/}
                Import existing Json
                <input type="file" accept=".json" onChange={handleChange} />
            </label>
            <br></br>
            <h1>
            {nConnections && (<>{nConnections} connections loaded</>)} 
            </h1>
        </div>
    )
}

//Component for prompting the auto connection of rooms and hallways
function AutoFill({edges, createConnection}){
    const [prompted, setPrompted] = useState(false);

    function autoFill(){
        
    
        setPrompted(true);
    }




    return (
        <>
        { !prompted && (
            <div className='autoFillOverlay'>
                Connections can be made automatically between nodes,<br></br>
                as long as they are named properly <br></br><br></br>
                <div className='connectionsBtn' onClick={autoFill}>
                    Generate connections between rooms and hallways?
                </div>
            </div>
        )}
        </>
    )
}