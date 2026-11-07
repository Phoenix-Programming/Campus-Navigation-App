import { useCallback, useState } from "react";
import LeafletMap from "../components/LeafletMap";
import MapUi from "../components/MapUi";
import "../styles/map.scss";

//Map container function, returns the ui on top of the leaflet map
export default function Map(){
    const [welcomeOpen, setWelcomeOpen] = useState(true);
    const [focusedIndoorMaps, setFocusedIndoorMaps] = useState<Set<string>>(() => new Set());

    const handleIndoorMapFocusChange = useCallback((id: string, isFocused: boolean) => {
        setFocusedIndoorMaps((current) => {
            if (current.has(id) === isFocused) {
                return current;
            }

            const next = new Set(current);
            if (isFocused) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    return (
        <div className={`map-page${welcomeOpen || focusedIndoorMaps.size > 0 ? " map-underlay-active" : ""}${welcomeOpen ? " map-welcome-active" : ""}`}>
            <LeafletMap onIndoorMapFocusChange={handleIndoorMapFocusChange}/>
            <MapUi onWelcomeOpenChange={setWelcomeOpen} showControls={!welcomeOpen}/>
        </div>
    )
}