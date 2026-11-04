import { useState } from "react";
import GamePicker, { gameForApi } from "./GamePicker";

/*
 * Inline form for starting a plan: what, where, when (optional) and an
 * optional call link. A time is what turns on the reminders.
 */
function NewPlanForm({ onSubmit, onCancel }) {
    const [title, setTitle] = useState("");
    const [where, setWhere] = useState("");
    const [when, setWhen] = useState("");
    const [meetLink, setMeetLink] = useState("");
    const [game, setGame] = useState(null);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return setError("What's the plan?");
        const plan = { title: title.trim() };
        if (where.trim()) plan.where = where.trim();
        if (when) {
            plan.startsAt = new Date(when).toISOString();
            plan.whenText = new Date(when).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
        }
        if (meetLink.trim()) plan.meetLink = meetLink.trim();
        const chosen = gameForApi(game);
        if (game && !chosen) return setError("Name the game, or pick one from the list.");
        if (chosen) plan.game = chosen;
        try {
            setError("");
            await onSubmit(plan);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't create the plan.");
        }
    };

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
        <form className="plan-form modal panel" onSubmit={submit}>
            <div className="field">
                <label htmlFor="plan-title">What's the plan?</label>
                <input id="plan-title" type="text" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Game night" autoFocus />
            </div>
            <div className="field">
                <label htmlFor="plan-where">Where</label>
                <input id="plan-where" type="text" value={where} maxLength={120} onChange={(e) => setWhere(e.target.value)} placeholder="Somewhere, or online" />
            </div>
            <div className="field">
                <label htmlFor="plan-when">When (turns on reminders)</label>
                <input id="plan-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="field">
                <label>Game (optional)</label>
                <GamePicker value={game} onChange={setGame} />
            </div>
            <div className="field">
                <label htmlFor="plan-link">Call link</label>
                <input id="plan-link" type="text" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." />
                <small>
                    No link yet? <a href="https://meet.new" target="_blank" rel="noopener noreferrer">Start a Meet</a>, then paste it here.
                </small>
            </div>
            {error && <p className="error">{error}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" className="lime">Create</button>
                <button type="button" className="plain" onClick={onCancel}>Cancel</button>
            </div>
        </form>
        </div>
    );
}

export default NewPlanForm;
