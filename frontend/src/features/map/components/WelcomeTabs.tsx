import type { CSSProperties } from "react";
import clsx from "clsx";
import type { Step } from "./WelcomeBox";
import "../styles/welcome-tabs.scss";


type WelcomeTabsProps = {
    steps: Step[];
    activeStep: number;
    onSelect: (step: number) => void;
};


export default function WelcomeTabs({ steps, activeStep, onSelect }: WelcomeTabsProps): React.ReactElement {
    //style conditional for width
    const tabCountStyle: CSSProperties | undefined = steps.length > 8
        ? { "--welcome-step-count": steps.length } as CSSProperties
        : undefined;


    return(
        <div
			className={clsx(
				"welcome-top-bar",
				{
					"welcome-top-bar-many-steps": steps.length > 8,
				}
			)}
            style={tabCountStyle}
        >
            {/* map each step to its own bubble on top of screen */}
            {steps.map((step) => (
                <button
                    className={clsx(
                        "welcome-tab",
                        {
                            "welcome-tab-active": step.step === activeStep,
                        }
                    )}
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
