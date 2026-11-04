import { useState } from "react";
import GamePicker, { gameForApi } from "./GamePicker";
import { logSession } from "../api/sessions";
import { fileToDataUrl } from "../lib/image";

/*
 * Records a game the group played: which game, who was there, who won, a
 * note, and a screenshot of the scoreboard. Started from a plan ("We
 * played") it fills in the game and the people who said they were going.
 */
function SessionForm({ group, plan, currentUser, onDone, onCancel }) {
    const going = plan?.rsvps.filter((r) => r.status === "going").map((r) => r.userId) ?? [];
    const [game, setGame] = useState(plan?.game ? { name: plan.game.name, url: plan.game.url ?? "", code: plan.game.code ?? "" } : null);
    const [players, setPlayers] = useState(going.length ? going : currentUser ? [currentUser._id] : []);
    const [winnerId, setWinnerId] = useState("");
    const [note, setNote] = useState("");
    const [screenshot, setScreenshot] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const toggle = (id) => {
        setPlayers((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
        if (winnerId === id) setWinnerId("");
    };

    const pickFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setError("");
            setScreenshot(await fileToDataUrl(file));
        } catch (err) {
            setError(err.message || "Couldn't read that image.");
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        const chosen = gameForApi(game);
        if (!chosen) return setError("Which game did you play?");
        if (players.length === 0) return setError("Pick who played.");
        setSaving(true);
        try {
            setError("");
            await logSession(group._id, {
                gameName: chosen.name,
                playerIds: players,
                winnerId: winnerId || undefined,
                note: note.trim() || undefined,
                screenshot: screenshot || undefined,
                planId: plan?._id,
            });
            onDone();
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't save the session.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
        <form className="plan-form modal panel" onSubmit={submit}>
            <h3>We played</h3>
            <div className="field">
                <label>Game</label>
                <GamePicker value={game} onChange={setGame} />
            </div>
            <div className="field">
                <label>Who played?</label>
                <div className="chips">
                    {group.members.map((m) => (
                        <label key={m._id} className={players.includes(m._id) ? "chip on" : "chip"}>
                            <input type="checkbox" checked={players.includes(m._id)} onChange={() => toggle(m._id)} />
                            {m.username}
                        </label>
                    ))}
                </div>
            </div>
            <div className="field">
                <label htmlFor="winner">Winner (optional)</label>
                <select id="winner" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                    <option value="">No winner / not scored</option>
                    {group.members
                        .filter((m) => players.includes(m._id))
                        .map((m) => (
                            <option key={m._id} value={m._id}>
                                {m.username}
                            </option>
                        ))}
                </select>
            </div>
            <div className="field">
                <label htmlFor="note">Note (optional)</label>
                <input id="note" type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Final score, a funny moment..." />
            </div>
            <div className="field">
                <label htmlFor="shot">Scoreboard screenshot (optional)</label>
                <input id="shot" type="file" accept="image/*" onChange={pickFile} />
                {screenshot && <img className="shot-preview" src={screenshot} alt="Screenshot preview" />}
            </div>
            {error && <p className="error">{error}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" className="lime" disabled={saving}>
                    {saving ? "Saving..." : "Save to history"}
                </button>
                <button type="button" className="plain" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </form>
        </div>
    );
}

export default SessionForm;
