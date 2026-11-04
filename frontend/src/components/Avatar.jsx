const COLORS = ["#ff6fb5", "#ffd23f", "#7ae582", "#6ec6ff", "#ffa552", "#c3a6ff"];
const INK = "#1b2a6b";

const hashOf = (name) => {
    let h = 2166136261;
    for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
};

/*
 * A little pixel critter, different for every name. The body is a 5x5
 * grid that is mirrored left to right (so it always looks like a
 * creature), with two eyes, and optional ears and feet picked from the
 * hash. Same name, same critter, everywhere.
 */
function Avatar({ name = "?", online }) {
    const h = hashOf(name);
    const color = COLORS[h % COLORS.length];
    // A solid 5x4 body (rows 2-5) so it always reads as a creature; the
    // hash only nicks the corners and bottom, so each name differs.
    const cells = [];
    const nick = (bit) => (h >>> bit) & 1;
    for (let y = 2; y <= 5; y += 1) {
        for (let x = 1; x <= 5; x += 1) {
            const corner = (y === 2 || y === 5) && (x === 1 || x === 5);
            if (corner && nick(4 + x + y) === 1) continue;
            if (y === 5 && (x === 2 || x === 4) && nick(11 + x) === 1) continue;
            cells.push([x, y]);
        }
    }
    const belly = nick(17);
    const ears = h & 1;
    const feet = (h >>> 1) & 1;
    return (
        <span className="avatar pixel" aria-hidden="true">
            <svg viewBox="0 0 7 8" shapeRendering="crispEdges">
                {ears === 1 && (
                    <>
                        <rect x="1" y="0" width="1" height="2" fill={INK} />
                        <rect x="5" y="0" width="1" height="2" fill={INK} />
                    </>
                )}
                {cells.map(([x, y]) => (
                    <rect key={`o${x}-${y}`} x={x - 0.18} y={y - 0.18} width="1.36" height="1.36" fill={INK} />
                ))}
                {cells.map(([x, y]) => (
                    <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
                ))}
                {belly === 1 && <rect x="2" y="5" width="3" height="1" fill="#ffffffaa" />}
                <rect x="2" y="3" width="1" height="1" fill="#fff" />
                <rect x="4" y="3" width="1" height="1" fill="#fff" />
                <rect x="2.45" y="3.2" width="0.55" height="0.6" fill={INK} />
                <rect x="4.45" y="3.2" width="0.55" height="0.6" fill={INK} />
                {feet === 1 && (
                    <>
                        <rect x="2" y="6" width="1" height="1" fill={INK} />
                        <rect x="4" y="6" width="1" height="1" fill={INK} />
                    </>
                )}
            </svg>
            {online !== undefined && <i className={online ? "dot on" : "dot"} title={online ? "Online" : "Offline"} />}
        </span>
    );
}

export default Avatar;
