import { useState } from "react";

export const THEMES = ["rails", "lawn", "flap", "pet"];
const LABELS = { rails: "Rails", lawn: "Lawn", flap: "Flap", pet: "Pet" };
// Saved choices from before the rename keep working.
const LEGACY = { sky: "rails", night: "lawn" };

export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem("theme", theme);
    } catch {
        /* storage can be blocked; the choice just won't persist */
    }
}

export function initTheme() {
    let saved = null;
    try {
        saved = localStorage.getItem("theme");
    } catch {
        /* ignore */
    }
    const theme = LEGACY[saved] ?? saved;
    document.documentElement.dataset.theme = THEMES.includes(theme) ? theme : "rails";
}

/*
 * Four looks: "Rails" (a bright train yard, in the spirit of endless
 * runner games), "Lawn" (a night garden), "Flap" (pixel sky and green
 * pipes) and "Pet" (a warm cartoon room). Original art; they only change
 * colours, shapes and backgrounds.
 */
function ThemeToggle() {
    const [theme, setTheme] = useState(document.documentElement.dataset.theme || "rails");

    const pick = (t) => {
        applyTheme(t);
        setTheme(t);
    };

    return (
        <div className="theme-toggle" role="group" aria-label="Look">
            {THEMES.map((t) => (
                <button key={t} type="button" className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => pick(t)}>
                    {LABELS[t]}
                </button>
            ))}
        </div>
    );
}

export default ThemeToggle;
