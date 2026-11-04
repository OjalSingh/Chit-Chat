import { useEffect, useState } from "react";
import { rsvpPlan, votePlan, updatePlan } from "../api/plans";

const STATUSES = [
    ["going", "Going"],
    ["maybe", "Maybe"],
    ["out", "Can't"],
];

// "in 2h 10m", "in 35m", "now", or "" once it has started.
function countdown(startsAt, now) {
    const ms = new Date(startsAt).getTime() - now;
    if (Number.isNaN(ms) || ms < -3600_000) return "";
    if (ms <= 0) return "happening now";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${Math.max(1, mins)}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
    return `in ${Math.floor(hrs / 24)}d`;
}

/* Join the call, or add the link: paste one, or start a Meet first. */
function CallRow({ plan, onSave }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState("");
    const [error, setError] = useState("");

    const save = async () => {
        try {
            setError("");
            await onSave(value.trim());
            setEditing(false);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't save the link.");
        }
    };

    if (editing) {
        return (
            <div style={{ display: "grid", gap: "6px" }}>
                <div className="search-row">
                    <input type="text" value={value} placeholder="https://meet.google.com/..." onChange={(e) => setValue(e.target.value)} aria-label="Call link" />
                    <button className="small lime" onClick={save}>Save</button>
                </div>
                <small>
                    <a href="https://meet.new" target="_blank" rel="noopener noreferrer">Start a Meet</a>, then paste its link.
                    {plan.meetLink && " Save an empty box to remove the link."}
                </small>
                {error && <small className="error">{error}</small>}
            </div>
        );
    }

    return (
        <div className="vote-row">
            {plan.meetLink && (
                <a className="btn small blue" href={plan.meetLink} target="_blank" rel="noopener noreferrer">
                    Join call
                </a>
            )}
            <button
                className="small plain"
                onClick={() => {
                    setValue(plan.meetLink || "");
                    setEditing(true);
                }}
            >
                {plan.meetLink ? "Change link" : "Add call link"}
            </button>
        </div>
    );
}

/*
 * A live plan ticket. Every button calls the API; the server then emits
 * plan:update to the whole group, and Chat.jsx swaps in the new plan,
 * so all members see the same ticket. Left: the details. Right: the
 * tear-off stub with the RSVP buttons.
 */
function PlanCard({ plan, members, currentUser, onChange }) {
    const nameOf = (id) => members.find((m) => m._id === id)?.username ?? "someone";
    const myRsvp = plan.rsvps.find((r) => r.userId === currentUser?._id)?.status;
    // Re-render every 30s so the countdown stays honest.
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!plan.startsAt) return undefined;
        const id = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(id);
    }, [plan.startsAt]);
    const soon = plan.startsAt ? countdown(plan.startsAt, now) : "";

    const going = plan.rsvps.filter((r) => r.status === "going");
    const maybe = plan.rsvps.filter((r) => r.status === "maybe");

    const act = (fn) => async () => {
        try {
            onChange(await fn());
        } catch (err) {
            console.error(err);
        }
    };

    // Like act(), but passes errors back so the call row can show them.
    const act2 = (fn) => async (...args) => {
        onChange(await fn(...args));
    };

    return (
        <div className="ticket">
            <div className="ticket-main">
                {plan.source === "ai" && <span className="tag" title="Suggested from your chat">Suggested</span>}
                <h3>{plan.title}</h3>

                <div className="detail">
                    <b>When</b>
                    <span>
                        {plan.whenText || (plan.startsAt ? new Date(plan.startsAt).toLocaleString() : "Not decided yet")}
                        {soon && <span className="soon">{soon}</span>}
                    </span>
                </div>
                {plan.where && (
                    <div className="detail">
                        <b>Where</b>
                        <span>{plan.where}</span>
                    </div>
                )}

                {plan.timeOptions.length > 0 && !plan.whenText && (
                    <div style={{ display: "grid", gap: "6px" }}>
                        <small>Vote for a time</small>
                        {plan.timeOptions.map((option) => {
                            const mine = option.votes.includes(currentUser?._id);
                            return (
                                <div key={option._id} className="vote-row">
                                    <button className={mine ? "small lime" : "small plain"} onClick={act(() => votePlan(plan._id, option._id))}>
                                        {mine ? "✓ " : ""}
                                        {option.label}
                                    </button>
                                    <span className="pips" aria-label={`${option.votes.length} votes`}>
                                        {option.votes.map((v) => (
                                            <i key={v} />
                                        ))}
                                    </span>
                                    <button
                                        className="small pink"
                                        title="Lock in this time"
                                        onClick={act(() => updatePlan(plan._id, { pickOptionId: option._id }))}
                                    >
                                        Lock in
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <CallRow plan={plan} onSave={act2((meetLink) => updatePlan(plan._id, { meetLink }))} />

                <small>
                    {going.length} going{going.length > 0 && `: ${going.map((r) => nameOf(r.userId)).join(", ")}`}
                    {maybe.length > 0 && ` · ${maybe.length} maybe`}
                </small>
            </div>

            <div className="ticket-stub">
                {STATUSES.map(([status, label]) => (
                    <button
                        key={status}
                        className={myRsvp === status ? "chosen" : "plain"}
                        onClick={act(() => rsvpPlan(plan._id, status))}
                    >
                        {label}
                    </button>
                ))}
                <button className="small plain" onClick={act(() => updatePlan(plan._id, { status: "cancelled" }))}>
                    {plan.source === "ai" ? "Dismiss" : "Cancel"}
                </button>
            </div>
        </div>
    );
}

export default PlanCard;
