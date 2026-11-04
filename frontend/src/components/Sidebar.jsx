import Avatar from "./Avatar";

function Sidebar({ friends, selectedUser, onSelectFriend, onlineUsers }) {
    return (
        <div style={{ display: "grid", gap: "10px" }}>
            <h2>Your crew</h2>

            {friends.length === 0 ? (
                <p className="muted">No one here yet. Find people in the Add tab.</p>
            ) : (
                friends.map((friend) => {
                    const isSelected = selectedUser?._id === friend._id;
                    const isOnline = onlineUsers.includes(friend._id);
                    return (
                        <div
                            key={friend._id}
                            className={isSelected ? "row selected" : "row"}
                            onClick={() => onSelectFriend(friend)}
                        >
                            <Avatar name={friend.username} online={isOnline} />
                            <div className="grow">
                                <div className="name">{friend.username}</div>
                                <small>{friend.email}</small>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default Sidebar;
