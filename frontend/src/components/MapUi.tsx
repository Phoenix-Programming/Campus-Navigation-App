import "@styles/main.scss";
import WelcomeBox from "./WelcomeBox";

export default function MapUi() {


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

// Top bar components: SearchBar, QuickAccess, QuickSettings, MapSettings

//Search bar component
function SearchBar() {
    return (
        <div className="search-bar">
            <input type="text" placeholder="Where to, Phoenix?" />
        </div>
    );
}

//Component to display several quick access places and options
function QuickAccess() {
    return (
        <div className="quick-access">
            {/* Quick access buttons or links can be added here */}
        </div>
    );
}


//Component for quick settings options
function QuickSettings() {
    return (
        <div className="quick-settings">
            {/* Quick settings controls can be added here */}
        </div>
    );
}

//Component for map settings options through hamburger menu
function MapSettings() {
    return (
        <div className="map-settings">
            {/* Map settings controls can be added here */}
        </div>
    );
}

