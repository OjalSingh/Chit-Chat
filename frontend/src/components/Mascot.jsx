import { useEffect, useRef, useState } from "react";
import { play } from "../lib/sound";

const LINES = {
    idle: "Pick a friend and say hi.",
    happy: "Hehe! That tickles.",
    wow: "Okay, okay, you found me.",
    sleepy: "Zzz... oh! You're back.",
};

/*
 * Pip, the mascot: a pixel blob with a tuft. Original character, drawn
 * on a 16x16 grid. It blinks, hops when poked, and after five pokes does
 * a little party (a hidden easter egg). Mood only changes the face.
 */
function Mascot({ name, size = 120 }) {
    const [mood, setMood] = useState("idle");
    const [hop, setHop] = useState(0);
    const [blink, setBlink] = useState(false);
    const pokes = useRef(0);
    const timer = useRef(null);

    useEffect(() => {
        const id = setInterval(() => {
            setBlink(true);
            setTimeout(() => setBlink(false), 140);
        }, 3200);
        return () => clearInterval(id);
    }, []);
    useEffect(() => () => clearTimeout(timer.current), []);

    const poke = () => {
        pokes.current += 1;
        setHop((n) => n + 1);
        const next = pokes.current % 5 === 0 ? "wow" : "happy";
        play(next === "wow" ? "party" : "happy");
        setMood(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setMood("idle"), 1800);
    };

    const eyes = blink || mood === "sleepy" ? "line" : mood === "happy" || mood === "wow" ? "happy" : "open";
    return (
        <div className="mascot">
            <button type="button" className={`pip ${mood}`} key={hop} onClick={poke} aria-label="Poke Pip the mascot" style={{ width: size, height: size }}>
                <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                    <path fill="#1b2a6b" d="M7 0h2v1h1v2h-1V2H8v1H7zM4 3h8v1h2v2h1v6h-1v2h-2v1H5v-1H3v-2H2V6h1V4h1z" />
                    <path fill="var(--pip-body, #ffd23f)" d="M5 4h6v1h2v1h1v6h-1v1h-1v1H5v-1H4v-1H3V6h1V5h1z" />
                    <path fill="#fff6c8" d="M6 10h4v1h1v1H5v-1h1z" />
                    <path fill="#ff9ec9" d="M4 9h2v1H4zM10 9h2v1h-2z" />
                    <path fill="#ff8a1f" d="M7 9h2v1H7z" />
                    {eyes === "open" && (
                        <>
                            <path fill="#1b2a6b" d="M5 6h2v3H5zM9 6h2v3H9z" />
                            <path fill="#fff" d="M5 6h1v1H5zM9 6h1v1H9z" />
                        </>
                    )}
                    {eyes === "line" && <path fill="#1b2a6b" d="M5 8h2v1H5zM9 8h2v1H9z" />}
                    {eyes === "happy" && <path fill="#1b2a6b" d="M5 8h1V7h1v1h1zM9 8h1V7h1v1h1z" transform="translate(-1 0)" />}
                </svg>
                {mood === "wow" && <span className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
            </button>
            <p className="pip-line" role="status">
                {mood === "idle" && name ? `Hi ${name}! ${LINES.idle}` : LINES[mood]}
            </p>
        </div>
    );
}

export default Mascot;
