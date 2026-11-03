
/*
 * Renders one conversation: a direct chat with selectedUser,
 * or a group chat with selectedGroup. Group messages arrive with
 * senderId populated ({ _id, username }) so we can label them.
 */
import PlanCard from "./PlanCard";

function ChatWindow({
    selectedUser,
    selectedGroup,
    messages,
    currentUser,
    onLeaveGroup,
    plans = [],
    onPlanChange,
    onFindPlan,
    onNewPlan,
    planNotice,
}) {
    const senderIdOf = (message) => message.senderId?._id ?? message.senderId;

    const senderName = (message) => {
        if (currentUser && senderIdOf(message) === currentUser._id) return "You";
        if (selectedGroup) return message.senderId?.username ?? "Someone";
        return selectedUser.username;
    };

    const hasChat = selectedUser || selectedGroup;

    return (

<div style={{ flex: 1 }}>
<h2>Conversation</h2>

            {hasChat ? (
                <> 
                    {selectedGroup ? (
                        <p>
                            <strong>{selectedGroup.name}</strong>{" "}
                            <small>
                                ({selectedGroup.members.map((m) => m.username).join(", ")})
                            </small>{" "}
                            <button onClick={onLeaveGroup}>Leave group</button>
                        </p>
                    ) : (
                        <p>
                            Chatting with <strong>{selectedUser.username}</strong>
                        </p>
                    )}

                    {selectedGroup && (
                        <div style={{ marginBottom: "10px" }}>
                            <button onClick={onFindPlan}>✨ Turn this chat into a plan</button>{" "}
                            <button onClick={onNewPlan}>+ New plan</button>
                            {planNotice && <small style={{ marginLeft: "8px" }}>{planNotice}</small>}
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

                    {messages.length === 0 ? (
                        <p>No messages yet.</p>
                    ) : (
                        messages.map((message) => {

                            const isMine =
                                currentUser &&
                                senderIdOf(message) === currentUser._id;

                            return (
                                <div
                                    key={message._id}
                                    style={{
                                        border: "1px solid gray",
                                        padding: "8px",
                                        marginBottom: "8px",
                                        textAlign: isMine ? "right" : "left",
                                    }}
                                >
                                    <strong>{senderName(message)}</strong>

                                    <br />

                                    {message.text}
                                </div>
                            );
                        })
                    )}
                </>
            ) : (
                <p>Select a friend or a group.</p>
            )} 
        </div>
    );
}

export default ChatWindow;
