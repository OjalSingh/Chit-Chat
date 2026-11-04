import { useEffect, useState } from "react";
import { getCatalog } from "../api/sessions";

let cached = null; // the catalog never changes during a visit

/*
 * Choose what the group will play: a game from the list, or your own link.
 * value is { name, url, code } (all optional strings) or null for none.
 */
function GamePicker({ value, onChange }) {
    const [catalog, setCatalog] = useState(cached ?? []);

    useEffect(() => {
        if (cached) return;
        getCatalog()
            .then((list) => {
                cached = list;
                setCatalog(list);
            })
            .catch(() => {});
    }, []);

    const selected = catalog.find((g) => g.name === value?.name);
    const choice = !value ? "" : selected ? selected.key : "custom";

    const choose = (key) => {
        if (!key) return onChange(null);
        if (key === "custom") return onChange({ name: "", url: "", code: "" });
        const game = catalog.find((g) => g.key === key);
        onChange({ name: game.name, url: game.url, code: "" });
    };

    const set = (field, text) => onChange({ ...value, [field]: text });

    return (
        <div style={{ display: "grid", gap: "6px" }}>
            <select value={choice} onChange={(e) => choose(e.target.value)} aria-label="Game">
                <option value="">No game yet</option>
                {catalog.map((g) => (
                    <option key={g.key} value={g.key}>
                        {g.name} ({g.kind})
                    </option>
                ))}
                <option value="custom">Something else...</option>
            </select>
            {choice === "custom" && (
                <input type="text" value={value.name} maxLength={60} placeholder="Game name" onChange={(e) => set("name", e.target.value)} aria-label="Game name" />
            )}
            {choice && (
                <>
                    <input
                        type="text"
                        value={value.url}
                        placeholder="Link to the room (https://...)"
                        onChange={(e) => set("url", e.target.value)}
                        aria-label="Game link"
                    />
                    {(choice === "custom" || selected?.code) && (
                        <input type="text" value={value.code} maxLength={30} placeholder="Room code (if it has one)" onChange={(e) => set("code", e.target.value)} aria-label="Room code" />
                    )}
                    {selected?.note && <small>{selected.note}</small>}
                </>
            )}
        </div>
    );
}

/* Turns picker state into what the API takes, or null when no game. */
export function gameForApi(value) {
    if (!value?.name?.trim()) return null;
    const game = { name: value.name.trim() };
    if (value.url?.trim()) game.url = value.url.trim();
    if (value.code?.trim()) game.code = value.code.trim();
    return game;
}

export default GamePicker;
