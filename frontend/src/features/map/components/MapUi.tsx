import React from "react";
import WelcomeBox from "./WelcomeBox";
import SearchBar from "./SearchBar";
import QuickAccess from "./QuickAccess";
import QuickSettings from "./QuickSettings";
import MapSettings from "./MapSettings";
import "../styles/map-ui.scss";

type MapUiProps = {
    onWelcomeOpenChange: (isOpen: boolean) => void;
    showControls: boolean;
};

export default function MapUi({ onWelcomeOpenChange, showControls }: MapUiProps): React.ReactElement {
    return (
        <div className="map-ui">
            <WelcomeBox onOpenChange={onWelcomeOpenChange}/>

            {showControls && (
                <div className="topbar">
                    <SearchBar/>
                    <QuickAccess/>
                    <QuickSettings/>
                    <MapSettings/>
                </div>
            )}
        </div>
    )
}
