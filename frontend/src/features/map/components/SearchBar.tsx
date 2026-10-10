import React from "react";
import "../styles/search-bar.scss";


export default function SearchBar(): React.ReactElement {
    return (
        <div className="search-bar">
            <input type="text" placeholder="Where to, Phoenix?" />
        </div>
    );
}
