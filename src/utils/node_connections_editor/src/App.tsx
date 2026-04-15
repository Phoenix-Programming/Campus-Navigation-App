import { useState, useRef } from 'react'
import './assets/styles.css'

export default function App() {

  return (
    <Upload />
  )
}



function Upload() {
    const [svg, setSvg] = useState(null);
    const [json, setJson] = useState(null);
    const [uplState, setUplState] = useState(0);

    function handleChange(e) {
        const f = e.target.files[0];

        if (f.type === "application/json") { //check if the uploaded file is a JSON
          setJson(URL.createObjectURL(f));
          setUplState(uplState + 1);
          return;
        }
        else if (f.type === "image/svg+xml") {
          setSvg(URL.createObjectURL(f));
          setUplState(uplState + 1);
          return;
        }
        else {
          alert("Please upload a valid SVG or JSON file.");
          return;
        }
    }

    return (
        <div>
            {uplState < 2 &&
            <div className='instructions'>
                <p>Upload a JSON file containing the graph data and an SVG file containing the graph visualization.</p>
                <p>Use the middle mouse button to pan around the SVG and the scroll wheel to zoom in and out.</p>
            </div>}
            <div className="upload">
            {uplState !== 2 && (
                <label className="uploadBtn">
                    {svg == null ? "Upload SVG" : "SVG Uploaded"}
                    <input type="file" accept=".svg" onChange={handleChange} />
                </label>
            )}
            {uplState !== 2 && (
                <label className="uploadBtn">
                    {json == null ? "Upload JSON" : "JSON Uploaded"}
                    <input type="file" accept=".json" onChange={handleChange} />
                </label>
            )}
            </div>
            {json && svg && <SVGViewer src={svg} />} {/*display the SVG viewer if a file has been uploaded*/}
        </div>
    );
}

function SVGViewer({ src }) {
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
            <img
                src={src} //display the uploaded SVG image
                alt="svg"
                draggable={false}
                style={{
                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, //apply both translation and scaling to the image
                    transformOrigin: "center", //set the origin for scaling to the center of the image
                    userSelect: "none" //prevent text selection while dragging
                }}
            />
        </div>
    );
}