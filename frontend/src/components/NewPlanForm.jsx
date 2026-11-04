import { useState } from "react";
import GamePicker, { gameForApi } from "./GamePicker";
import TimePicker from "./TimePicker";
import { prettyWhen } from "../lib/when";

const MAX_OPTIONS = 5;

/*
 * Form for starting a plan: what, where, when and an optional game and
 * call link. "When" is either one time, or a poll: a few dated options
 * for the group to vote on, then someone locks one in. A time is what
 * turns on the reminders.
 */
function NewPlanForm({ onSubmit, onCancel }) {
    const [title, setTitle] = useState("");
    const [where, setWhere] = useState("");
    const [mode, setMode] = useState("fixed"); // "fixed" or "poll"
    const [when, setWhen] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [meetLink, setMeetLink] = useState("");
    const [game, setGame] = useState(null);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return setError("What's the plan?");
        const plan = { title: title.trim() };
        if (where.trim()) plan.where = where.trim();
        if (mode === "fixed" && when) {
            plan.startsAt = new Date(when).toISOString();
            plan.whenText = prettyWhen(when);
        }
        if (mode === "poll") {
            const filled = options.filter(Boolean);
            if (filled.length < 2) return setError("Add at least two times to vote on.");
            if (new Set(filled).size !== filled.length) return setError("Two of the options are the same time.");
            plan.timeOptions = filled.map((o) => ({ label: prettyWhen(o), startsAt: new Date(o).toISOString() }));
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
                <label>When</label>
                <div className="seg" role="group" aria-label="How to pick the time">
                    <button type="button" className={mode === "fixed" ? "on" : ""} onClick={() => setMode("fixed")}>
                        I know the time
                    </button>
                    <button type="button" className={mode === "poll" ? "on" : ""} onClick={() => setMode("poll")}>
                        Let them vote
                    </button>
                </div>
                {mode === "fixed" ? (
                    <>
                        <TimePicker id="plan-when" value={when} onChange={setWhen} />
                        <small>
                            {when ? `${prettyWhen(when)}. Everyone gets reminders.` : "Skip it to decide later. A time turns on reminders."}
                        </small>
                    </>
                ) : (
                    <div className="poll-options">
                        {options.map((o, i) => (
                            <div key={i} className="poll-option">
                                <TimePicker value={o} onChange={(v) => setOptions((prev) => prev.map((p, j) => (j === i ? v : p)))} label={`Option ${i + 1}`} />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        className="small plain"
                                        aria-label={`Remove option ${i + 1}`}
                                        onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        {options.length < MAX_OPTIONS && (
                            <button type="button" className="small blue" onClick={() => setOptions((prev) => [...prev, ""])}>
                                + Another time
                            </button>
                        )}
                        <small>Everyone votes, then you lock in the winner.</small>
                    </div>
                )}
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
