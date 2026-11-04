import { useState } from "react";

export const THEMES = ["sky", "night"];

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

/* Two backgrounds: a daytime sky and a night flight. */
function ThemeToggle() {
    const [theme, setTheme] = useState(document.documentElement.dataset.theme || "sky");

    const pick = (t) => {
        applyTheme(t);
        setTheme(t);
    };

    return (
        <div className="theme-toggle" role="group" aria-label="Background">
            <button
                type="button"
                className={theme === "sky" ? "on" : ""}
                aria-pressed={theme === "sky"}
                onClick={() => pick("sky")}
            >
                Sky
            </button>
            <button
                type="button"
                className={theme === "night" ? "on" : ""}
                aria-pressed={theme === "night"}
                onClick={() => pick("night")}
            >
                Night
            </button>
        </div>
    );
}

export default ThemeToggle;
