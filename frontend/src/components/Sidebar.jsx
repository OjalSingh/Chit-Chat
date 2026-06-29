function Sidebar({
    friends,
    selectedUser,
    onSelectFriend,
    onlineUsers,
}) {
    return (
        <div style={{ width: "250px" }}>

            <h2>Friends</h2>

            {friends.length === 0 ? (
                <p>No users found.</p>
            ) : (
                friends.map((friend) => {

                    /*
                     * Compare the current friend with the selected
                     * conversation so we can highlight it.
                     */
                    const isSelected =
                        selectedUser?._id === friend._id;
                    const isOnline =
                        onlineUsers.includes(friend._id);
                    return (
                        <div
                            key={friend._id}
                            onClick={() => onSelectFriend(friend)}
                            style={{
                                border: isSelected
                                    ? "2px solid blue"
                                    : "1px solid gray",

                                backgroundColor: isSelected
                                    ? "#dbeafe"
                                    : "white",

                                padding: "10px",
                                marginBottom: "8px",
                                cursor: "pointer",
                                transition: "0.2s",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <span
                                    style={{
                                        width: "10px",
                                        height: "10px",
                                        borderRadius: "50%",

                                        backgroundColor: isOnline
                                            ? "#22c55e"
                                            : "#9ca3af",
                                    }}
                                />

                                <strong>{friend.username}</strong>
                            </div>

                            <br />

                            {friend.email}
                        </div>
                    );
                })
            )}

        </div>
    );
}

export default Sidebar;

