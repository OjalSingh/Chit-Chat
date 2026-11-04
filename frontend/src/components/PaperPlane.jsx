/*
 * The app mark: a folded paper plane. Pure SVG so it takes the
 * surrounding text colour for its outline and the theme for its fill.
 */
function PaperPlane({ size = 32, className = "" }) {
    return (
        <svg
            className={`plane ${className}`}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            aria-hidden="true"
        >
            <path d="M6 30 L58 6 L40 58 L30 38 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M30 38 L58 6" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M30 38 L28 52 L40 58 Z" fill="var(--pink)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
    );
}

export default PaperPlane;
