import LeafletMap from "../components/LeafletMap";
import MapUi from "../components/MapUi";

//Map container function, returns the ui on top of the leaflet map
export default function Map(){


    return (
        <div className="map-page">
            <MapUi/>
            <LeafletMap/>
        </div>
    )
}