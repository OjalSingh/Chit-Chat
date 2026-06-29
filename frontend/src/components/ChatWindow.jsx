function ChatWindow({
    selectedUser,
    messages,
    currentUser,
}) {
    return (

<div style={{ flex: 1 }}>
<h2>Conversation</h2>

            {selectedUser ? (
                <> 
                    <p>
                        Chatting with <strong>{selectedUser.username}</strong>
                    </p>

                    {messages.length === 0 ? (
                        <p>No messages yet.</p>
                    ) : (
                        messages.map((message) => {

                            const isMine =
                                currentUser &&
                                message.senderId === currentUser._id;

                            return (
                                <div
                                    key={message._id}
                                    style={{
                                        border: "1px solid gray",
                                        padding: "8px",
                                        marginBottom: "8px",

                                        /*
                                         * For now we simply align messages differently.
                                         * Later Socket.IO and CSS can improve this.
                                         */
                                        textAlign: isMine ? "right" : "left",
                                    }}
                                >
                                    <strong>
                                        {isMine ? "You" : selectedUser.username}
                                    </strong>

                                    <br />

                                    {message.text}
                                </div>
                            );
                        })
                    )}
                </>
            ) : (
                <p>Select a friend.</p>
            )} 
        </div>
    );
}

export default ChatWindow;

