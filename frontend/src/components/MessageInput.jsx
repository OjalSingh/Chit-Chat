import { useRef, useState } from "react";
import PaperPlane from "./PaperPlane";
import { play, buzz } from "../lib/sound";

/*
 * The composer. `onTyping` is called while the person types (at most once
 * every two seconds). Sending makes the plane fly off the button.
 */
function MessageInput({ value, onChange, onSend, onTyping, disabled }) {
    const [flying, setFlying] = useState(0);
    const lastPing = useRef(0);

    const send = () => {
        if (disabled || !value.trim()) return onSend();
        setFlying((n) => n + 1);
        play("send");
        buzz(8);
        onSend();
    };

    const change = (text) => {
        onChange(text);
        const now = Date.now();
        if (text && onTyping && now - lastPing.current > 2000) {
            lastPing.current = now;
            onTyping();
        }
    };

    return (
        <div className="composer">
            <input
                type="text"
                value={value}
                disabled={disabled}
                onChange={(e) => change(e.target.value)}
                /* Enter sends, same as the button. */
                onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                }}
                placeholder={disabled ? "Pick someone to chat with" : "Write a note..."}
                aria-label="Message"
            />
            <button className="pink send" onClick={send} disabled={disabled} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Send <span key={flying} className={flying ? "fly" : ""}><PaperPlane size={20} fixed /></span>
            </button>
        </div>
    );
}

export default MessageInput;
