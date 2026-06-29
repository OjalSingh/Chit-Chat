function MessageInput({
    value,
    onChange,
    onSend,
}) {
    return (
        <div>
        <h2>New Message</h2>

            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}

                /*
                * Pressing Enter provides the same behavior
                * as clicking the Send button.
                */
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onSend();
                    }
                }}

                placeholder="Type a message..."
                style={{
                    width: "300px",
                }}
            />

            <button
                onClick={onSend}
            >
                Send
            </button>


        </div>
    );
}

export default MessageInput;



            