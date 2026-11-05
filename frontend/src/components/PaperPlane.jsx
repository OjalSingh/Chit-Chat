/*
 * The app mark. Pure SVG so it takes colours from the theme.
 * Sky and Night show a folded paper plane; Flap shows a pixel bird;
 * Pet shows a cartoon cat face. CSS picks which one is visible, so the
 * mark changes the moment the theme does. `fixed` always draws the plane
 * (used for the send arrow).
 */
function PaperPlane({ size = 32, className = "", fixed = false }) {
    return (
        <span className={`mark ${fixed ? "fixed" : ""} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
            <svg className="m-plane plane" width={size} height={size} viewBox="0 0 64 64">
                <path d="M6 30 L58 6 L40 58 L30 38 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
                <path d="M30 38 L58 6" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
                <path d="M30 38 L28 52 L40 58 Z" fill="var(--pink)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
            </svg>
            {/* A little pixel bird on a 16x16 grid: body, belly, wing, eye, beak. */}
            <svg className="m-bird" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
                <path fill="#3b2a1a" d="M4 3h6v1h2v1h1v1h1v1h1v4h-1v1h-1v1H9v1H5v-1H3v-1H2V7h1V5h1z" />
                <path fill="#f8d838" d="M5 4h5v1h2v1h1v3h-1v1h-1v1H8v1H6v-1H4v-1H3V7h1V5h1z" />
                <path fill="#fff" d="M10 5h2v1h1v2h-1v1h-2V8H9V6h1z" />
                <path fill="#3b2a1a" d="M11 6h1v2h-1z" />
                <path fill="#e8481c" d="M12 9h3v2h-1v1h-3v-1h-1V9z" />
                <path fill="#fff" d="M4 8h3v1h1v1H6v1H4z" />
            </svg>
            <svg className="m-cat" width={size} height={size} viewBox="0 0 64 64">
                <path d="M8 26 L12 4 L28 14 Z M56 26 L52 4 L36 14 Z" fill="#ff9f43" stroke="#4a2a12" strokeWidth="3.5" strokeLinejoin="round" />
                <path d="M13 17 L14.5 10 L21 14 Z M51 17 L49.5 10 L43 14 Z" fill="#ffb8c6" />
                <ellipse cx="32" cy="36" rx="25" ry="22" fill="#ff9f43" stroke="#4a2a12" strokeWidth="3.5" />
                <ellipse cx="32" cy="44" rx="13" ry="9" fill="#fff4de" />
                <ellipse cx="22" cy="31" rx="5" ry="6" fill="#fff" stroke="#4a2a12" strokeWidth="2.5" />
                <ellipse cx="42" cy="31" rx="5" ry="6" fill="#fff" stroke="#4a2a12" strokeWidth="2.5" />
                <circle cx="23" cy="32" r="2.6" fill="#4a2a12" />
                <circle cx="41" cy="32" r="2.6" fill="#4a2a12" />
                <path d="M28 40 H36 L32 45 Z" fill="#ff6f8f" stroke="#4a2a12" strokeWidth="2" strokeLinejoin="round" />
                <path d="M32 45 V48 M32 48 Q28 52 24 49 M32 48 Q36 52 40 49" fill="none" stroke="#4a2a12" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M6 38 H16 M7 44 L16 42 M58 38 H48 M57 44 L48 42" stroke="#4a2a12" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
        </span>
    );
}

export default PaperPlane;
