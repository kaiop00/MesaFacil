import React from "react";

export default function StepBars({ currentStep, total = 3 }) {
    const steps = Array.from({ length: total }, (_, i) => i + 1);

    return (
        <div className="flex items-center gap-4 w-full max-w-150 px-7">
            {steps.map((step) => {
                const isFilled = step <= currentStep; 

                return (
                    <div key={step} className="flex-1">
                        <div
                            className={[
                                "h-[6px] rounded-full transition-all duration-300",
                                isFilled ? "bg-amber-400" : "bg-slate-200",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        />
                    </div>
                );
            })}
        </div>
    );
}
