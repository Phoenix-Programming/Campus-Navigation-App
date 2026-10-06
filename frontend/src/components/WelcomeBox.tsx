import { useState, type CSSProperties } from 'react';
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


    //Different pages for the welcome box
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
    return (
        <>


        {/*flip through pages until reaching the end of the steps*/}
        {welcomeState != Object.keys(steps).length && (
            <div className="welcome-box" onClick={() => undefined}>
                <WelcomeTabs
                    steps={Object.values(steps)}
                    activeStep={welcomeState}
                    onSelect={setwelcomeState}
                />

                <div/>


                {/*Title and description that changes with the current step*/ }
                <div className="welcome-title">{steps[welcomeState].title}</div>
                <div className="welcome-description">{steps[welcomeState].description}</div>



                <button className="previous-button" onClick={() => setwelcomeState(welcomeState!= 0?welcomeState - 1:welcomeState)}>
                    Previous
                </button>
                <button className="next-button" onClick={() => setwelcomeState(welcomeState + 1)}>
                    Next
                </button>

            </div>
        )}
        </>
    )
}

type WelcomeTabsProps = {
    steps: Step[];
    activeStep: number;
    onSelect: (step: number) => void;
};

function WelcomeTabs({ steps, activeStep, onSelect }: WelcomeTabsProps) {
    //style conditional for width
    const tabCountStyle = steps.length > 8
        ? { "--welcome-step-count": steps.length } as CSSProperties
        : undefined;

    return(
        <div
            className={`welcome-top-bar${steps.length > 8 ? " welcome-top-bar-many-steps" : ""}`}
            style={tabCountStyle}
        >
            {//map each step to it's own bubble on top of screen
            }
            {steps.map((step) => (
                <button
                    className={`welcome-tab${step.step === activeStep ? " welcome-tab-active" : ""}`}
                    key={step.step}
                    onClick={() => onSelect(step.step)}

                    type="button"
                >
                    {step.tab}
                </button>
            ))}
        </div>
    )
}