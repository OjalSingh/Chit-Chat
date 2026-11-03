import { useState } from "react";

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
        <div style={{ width: "250px" }}>
            <h2>Groups</h2>

            {groups.length === 0 ? (
                <p>No groups yet.</p>
            ) : (
                groups.map((group) => {
                    const isSelected = selectedGroup?._id === group._id;
                    return (
                        <div
                            key={group._id}
                            onClick={() => onSelectGroup(group)}
                            style={{
                                border: isSelected ? "2px solid blue" : "1px solid gray",
                                backgroundColor: isSelected ? "#dbeafe" : "white",
                                padding: "10px",
                                marginBottom: "8px",
                                cursor: "pointer",
                            }}
                        >
                            <strong>{group.name}</strong>
                            <br />
                            <small>{group.members.length} members</small>
                        </div>
                    );
                })
            )}

            {creating ? (
                <form onSubmit={submit} style={{ border: "1px dashed gray", padding: "10px" }}>
                    <input
                        type="text"
                        value={name}
                        maxLength={60}
                        placeholder="Group name"
                        onChange={(e) => setName(e.target.value)}
                    />
                    <p style={{ margin: "8px 0 4px" }}>Add friends:</p>
                    {friends.length === 0 && <p>Add some friends first.</p>}
                    {friends.map((friend) => (
                        <label key={friend._id} style={{ display: "block" }}>
                            <input
                                type="checkbox"
                                checked={picked.includes(friend._id)}
                                onChange={() => toggle(friend._id)}
                            />{" "}
                            {friend.username}
                        </label>
                    ))}
                    {error && <p style={{ color: "crimson" }}>{error}</p>}
                    <button type="submit">Create</button>{" "}
                    <button type="button" onClick={() => setCreating(false)}>
                        Cancel
                    </button>
                </form>
            ) : (
                <button onClick={() => setCreating(true)}>+ New group</button>
            )}
        </div>
    );
}

export default GroupList;
