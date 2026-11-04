import { useState } from "react";
import Avatar from "./Avatar";

/*
 * Lists the user's groups and holds the "New group" form.
 * Chat.jsx owns the data; this component only renders it and
 * reports clicks back through the callbacks.
 */
function GroupList({ groups, friends, selectedGroup, onSelectGroup, onCreateGroup }) {
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [picked, setPicked] = useState([]);
    const [error, setError] = useState("");

    const toggle = (id) =>
        setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Give the group a name.");
        if (picked.length === 0) return setError("Pick at least one friend.");
        try {
            setError("");
            await onCreateGroup(name.trim(), picked);
            setCreating(false);
            setName("");
            setPicked([]);
        } catch (err) {
            setError(err.response?.data?.message || "Could not create the group.");
        }
    };

    return (
        <div style={{ display: "grid", gap: "10px" }}>
            <h2>Rooms</h2>

            {groups.length === 0 ? (
                <p className="muted">No rooms yet. Start one with your crew.</p>
            ) : (
                groups.map((group) => {
                    const isSelected = selectedGroup?._id === group._id;
                    return (
                        <div
                            key={group._id}
                            className={isSelected ? "row selected" : "row"}
                            onClick={() => onSelectGroup(group)}
                        >
                            <Avatar name={group.name} />
                            <div className="grow">
                                <div className="name">{group.name}</div>
                                <small>{group.members.length} members</small>
                            </div>
                        </div>
                    );
                })
            )}

            {creating ? (
                <form onSubmit={submit} className="group-form">
                    <input
                        type="text"
                        value={name}
                        maxLength={60}
                        placeholder="Room name"
                        onChange={(e) => setName(e.target.value)}
                    />
                    <small>Who's coming?</small>
                    {friends.length === 0 && <p className="muted">Add some friends first.</p>}
                    {friends.map((friend) => (
                        <label key={friend._id} className="check">
                            <input
                                type="checkbox"
                                checked={picked.includes(friend._id)}
                                onChange={() => toggle(friend._id)}
                            />{friend.username}
                        </label>
                    ))}
                    {error && <p className="error">{error}</p>}
                    <div style={{ display: "flex", gap: "8px" }}>
                    <button type="submit" className="lime">Create</button>
                    <button type="button" className="plain" onClick={() => setCreating(false)}>
                        Cancel
                    </button>
                    </div>
                </form>
            ) : (
                <button className="blue" onClick={() => setCreating(true)}>+ New room</button>
            )}
        </div>
    );
}

export default GroupList;
