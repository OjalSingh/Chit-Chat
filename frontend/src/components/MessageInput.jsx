import PaperPlane from "./PaperPlane";

function MessageInput({ value, onChange, onSend, disabled }) {
    return (
        <div className="composer">
            <input
                type="text"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                /* Enter sends, same as the button. */
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSend();
                }}
                placeholder={disabled ? "Pick someone to chat with" : "Write a note..."}
                aria-label="Message"
            />
            <button className="pink" onClick={onSend} disabled={disabled} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Send <PaperPlane size={20} />
            </button>
        </div>
    );
}

export default MessageInput;
