import { useState } from "react";

export const THEMES = ["sky", "night", "flap", "pet"];
const LABELS = { sky: "Sky", night: "Night", flap: "Flap", pet: "Pet" };

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
    document.documentElement.dataset.theme = THEMES.includes(saved) ? saved : "sky";
}

/*
 * Four looks: a daytime sky, a night flight, "Flap" (pixel sky and green
 * pipes, in the spirit of old one-tap arcade games) and "Pet" (a warm
 * cartoon living room). They only change colours, shapes and art.
 */
function ThemeToggle() {
    const [theme, setTheme] = useState(document.documentElement.dataset.theme || "sky");

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
