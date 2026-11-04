const COLORS = ["#ff6fb5", "#ffd23f", "#7ae582", "#6ec6ff", "#ffa552", "#c3a6ff"];

/* A coloured badge with the first letter; colour is stable per name. */
function Avatar({ name = "?", online }) {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return (
        <span className="avatar" style={{ background: COLORS[hash % COLORS.length] }}>
            {name.charAt(0).toUpperCase()}
            {online !== undefined && <i className={online ? "dot on" : "dot"} title={online ? "Online" : "Offline"} />}
        </span>
    );
}

export default Avatar;
