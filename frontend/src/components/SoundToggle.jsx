import { useEffect, useState } from "react";
import { isSoundOn, onSoundChange, setSound } from "../lib/sound";

/* A speaker button: sound effects and phone buzz on or off. */
function SoundToggle() {
    const [on, setOn] = useState(isSoundOn());
    useEffect(() => onSoundChange(setOn), []);
    return (
        <button
            type="button"
            className="small plain sound-toggle"
            aria-pressed={on}
            aria-label={on ? "Sound on. Turn off" : "Sound off. Turn on"}
            title={on ? "Sound on" : "Sound off"}
            onClick={() => setSound(!on)}
        >
            <svg width="20" height="20" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
                <path fill="currentColor" d="M1 4h2l2-2v6L3 6H1z" />
                {on ? <path fill="currentColor" d="M6 3h1v4H6zM8 2h1v6H8z" /> : <path fill="currentColor" d="M6 3h1v1h1v1h1v1H8v1H7V6H6V5h1V4H6z" />}
            </svg>
        </button>
    );
}

export default SoundToggle;
