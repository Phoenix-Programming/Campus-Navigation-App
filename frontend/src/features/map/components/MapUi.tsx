import React from "react";
import WelcomeBox from "./WelcomeBox";
import SearchBar from "./SearchBar";
import QuickAccess from "./QuickAccess";
import QuickSettings from "./QuickSettings";
import MapSettings from "./MapSettings";
import "../styles/map-ui.scss";


export default function MapUi(): React.ReactElement {
    return (
        <div className="map-ui">
            <WelcomeBox/>


            {/* Top bar containing search and quick access/settings buttons */}
            <div className="topbar">
                <SearchBar/>
                <QuickAccess/>
                <QuickSettings/>
                <MapSettings/>
            </div>

        </div>
    )
}
