import { rsvpPlan, votePlan, updatePlan } from "../api/plans";

const STATUSES = [
    ["going", "Going"],
    ["maybe", "Maybe"],
    ["out", "Can't"],
];

/*
 * A live plan ticket. Every button calls the API; the server then emits
 * plan:update to the whole group, and Chat.jsx swaps in the new plan,
 * so all members see the same ticket. Left: the details. Right: the
 * tear-off stub with the RSVP buttons.
 */
function PlanCard({ plan, members, currentUser, onChange }) {
    const nameOf = (id) => members.find((m) => m._id === id)?.username ?? "someone";
    const myRsvp = plan.rsvps.find((r) => r.userId === currentUser?._id)?.status;
    const going = plan.rsvps.filter((r) => r.status === "going");
    const maybe = plan.rsvps.filter((r) => r.status === "maybe");

    const act = (fn) => async () => {
        try {
            onChange(await fn());
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="ticket">
            <div className="ticket-main">
                {plan.source === "ai" && <span className="tag" title="Suggested from your chat">Suggested</span>}
                <h3>{plan.title}</h3>

                <div className="detail">
                    <b>When</b>
                    <span>{plan.whenText || "Not decided yet"}</span>
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
