import { useEffect, useRef, useState } from "react";
import PlanCard from "./PlanCard";
import PaperPlane from "./PaperPlane";
import NewPlanForm from "./NewPlanForm";

/*
 * Renders one conversation: a direct chat with selectedUser,
 * or a group chat with selectedGroup. Group messages arrive with
 * senderId populated ({ _id, username }) so we can label them.
 * The header and the message list are separate grid rows in Chat.jsx's
 * layout; only the message list scrolls.
 */
function ChatWindow({
    selectedUser,
    selectedGroup,
    messages,
    currentUser,
    onLeaveGroup,
    plans = [],
    onPlanChange,
    onFindPlan,
    onCreatePlan,
    planNotice,
}) {
    const senderIdOf = (message) => message.senderId?._id ?? message.senderId;

    const senderName = (message) => {
        if (currentUser && senderIdOf(message) === currentUser._id) return "You";
        if (selectedGroup) return message.senderId?.username ?? "Someone";
        return selectedUser.username;
    };

    const hasChat = selectedUser || selectedGroup;
    const [creatingPlan, setCreatingPlan] = useState(false);
    useEffect(() => setCreatingPlan(false), [selectedGroup?._id]);

    // Keep the newest note in view.
    const bottom = useRef(null);
    useEffect(() => {
        bottom.current?.scrollIntoView({ block: "end" });
    }, [messages.length, selectedUser?._id, selectedGroup?._id]);

    return (
        <>
            <div className="convo-head">
                {selectedGroup ? (
                    <>
                        <div>
                            <h2>{selectedGroup.name}</h2>
                            <small>{selectedGroup.members.map((m) => m.username).join(", ")}</small>
                        </div>
                        <div className="tools">
                            {planNotice && <small>{planNotice}</small>}
                            <button className="small lime" onClick={() => setCreatingPlan(true)}>+ New plan</button>
                            <button className="small blue" onClick={onFindPlan}>Plan from chat</button>
                            <button className="small plain" onClick={onLeaveGroup}>Leave</button>
                        </div>
                    </>
                ) : selectedUser ? (
                    <h2>{selectedUser.username}</h2>
                ) : (
                    <h2>Chit-Chat</h2>
                )}
            </div>

            {selectedGroup && creatingPlan && (
                <NewPlanForm
                    onCancel={() => setCreatingPlan(false)}
                    onSubmit={async (plan) => {
                        await onCreatePlan(plan);
                        setCreatingPlan(false);
                    }}
                />
            )}

            {selectedGroup && plans.length > 0 && (
                <div className="plans">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan._id}
                            plan={plan}
                            members={selectedGroup.members}
                            currentUser={currentUser}
                            onChange={onPlanChange}
                        />
                    ))}
                </div>
            )}

            <div className="scroll">
                {!hasChat ? (
                    <div className="empty">
                        <PaperPlane size={72} />
                        <h3>Ready for take-off</h3>
                        <p className="muted">Pick someone from your crew or a room and send your first note.</p>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 ? (
                            <p className="muted" style={{ margin: "auto" }}>No notes yet. Say hi!</p>
                        ) : (
                            messages.map((message) => {
                                const isMine = currentUser && senderIdOf(message) === currentUser._id;
                                return (
                                    <div key={message._id} className={isMine ? "msg mine" : "msg"}>
                                        <span className="who">{senderName(message)}</span>
                                        {message.text}
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottom} />
                    </>
                )}
            </div>
        </>
    );
}

export default ChatWindow;
