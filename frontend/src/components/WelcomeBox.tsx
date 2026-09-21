import React, { useEffect, useState } from 'react';
import "@styles/main.scss";


type Step = {
    step: number;
    tab: string;
    title: string;
    description: string;
};

//welcome box component

export default function WelcomeBox() {
    const [welcomeState, setwelcomeState] = useState<number>(0);

    const steps: Record<number, Step> = {
        0: {
            step: 0,
            tab: "Intro",
            title: "FLPoly Campus Map Guide",
            description: "Welcome to FLPoly Campus Navigation! FLPoly Campus Navigation is a web-based mapping service for Florida Polytechnic University."
        },
        1: {
            step: 1,
            tab: "Find",
            title: "Find a Building",
            description: "Select a building or map layer to see more information."
        },
        2: {
            step: 2,
            tab: "Directions",
            title: "Get Directions",
            description: "Use the map controls to plan a route across campus."
        }
    }
    const onClick = () => {
        setwelcomeState(welcomeState + 1);
    }

    return (
        <>

        {welcomeState != 10 && (
            <label className={"welcome-box"} onClick={() => onClick}>
                <div/>



                <div className="welcome-title">{steps[welcomeState].title}</div>
                <div className="welcome-description">{steps[welcomeState].description}</div>



                <button className="previous-button" onClick={() => setwelcomeState(welcomeState - 1)}>
                    <div className="previous-button-background"></div>
                    <div className="previous">Previous</div>
                </button>
                <button className="next-button" onClick={() => setwelcomeState(welcomeState + 1)}>
                    <div className="next-button-background"></div>
                    <div className="next">Next</div>
                </button>







            </label>
        )}
        </>
    )
}