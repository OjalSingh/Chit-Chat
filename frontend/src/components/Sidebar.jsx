function Sidebar({
    friends,
    selectedUser,
    onSelectFriend,
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

                                /*
                                 * Small transition makes selection feel nicer
                                 * without adding any real styling complexity.
                                 */
                                transition: "0.2s",
                            }}
                        >
                            <strong>{friend.username}</strong>

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

            