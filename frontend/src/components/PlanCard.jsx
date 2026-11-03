import { rsvpPlan, votePlan, updatePlan } from "../api/plans";

const STATUSES = [
    ["going", "Going"],
    ["maybe", "Maybe"],
    ["out", "Can't"],
];

/*
 * A live Plan card. Every button calls the API; the server then emits
 * plan:update to the whole group, and Chat.jsx swaps in the new plan,
 * so all members see the same card.
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
        <div
            style={{
                border: "2px solid #7c3aed",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "10px",
                background: "#f5f3ff",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>📌 {plan.title}</strong>
                {plan.source === "ai" && <small title="Suggested from your chat">✨ AI suggested</small>}
            </div>

            <div style={{ margin: "6px 0" }}>
                {plan.whenText ? <div>🕒 {plan.whenText}</div> : <div>🕒 Time not set yet</div>}
                {plan.where && <div>📍 {plan.where}</div>}
            </div>

            {plan.timeOptions.length > 0 && !plan.whenText && (
                <div style={{ margin: "6px 0" }}>
                    <small>Vote for a time:</small>
                    {plan.timeOptions.map((option) => {
                        const mine = option.votes.includes(currentUser?._id);
                        return (
                            <div key={option._id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <button onClick={act(() => votePlan(plan._id, option._id))}>
                                    {mine ? "✓ " : ""}
                                    {option.label} ({option.votes.length})
                                </button>
                                <button
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

            <div style={{ display: "flex", gap: "6px", margin: "6px 0" }}>
                {STATUSES.map(([status, label]) => (
                    <button
                        key={status}
                        onClick={act(() => rsvpPlan(plan._id, status))}
                        style={{ fontWeight: myRsvp === status ? "bold" : "normal" }}
                    >
                        {myRsvp === status ? "● " : ""}
                        {label}
                    </button>
                ))}
            </div>

            <small>
                {going.length} going{going.length > 0 && `: ${going.map((r) => nameOf(r.userId)).join(", ")}`}
                {maybe.length > 0 && ` · ${maybe.length} maybe`}
            </small>

            <div style={{ marginTop: "6px" }}>
                <button onClick={act(() => updatePlan(plan._id, { status: "cancelled" }))}>
                    {plan.source === "ai" ? "Dismiss" : "Cancel plan"}
                </button>
            </div>
        </div>
    );
}

export default PlanCard;
