import Avatar from "./Avatar";
import { useState, useEffect } from "react";
import { searchUsers, sendFriendRequest } from "../api/friends";


function SearchUsers() {

    // Stores whatever the user types into the search box.

    const [searchText, setSearchText] = useState("");

    // Stores the users returned by the backend.
    const [results, setResults] = useState([]);

    // Stores if the user has searched and what it has searched
    const [hasSearched, setHasSearched] = useState(false);

    // What happened when we tried to add each person:
    // { [userId]: { state: "sending" | "sent" | "error", text } }
    const [requestStatus, setRequestStatus] = useState({});

    const setStatus = (id, status) => setRequestStatus((prev) => ({ ...prev, [id]: status }));

    const handleAdd = async (user) => {
        setStatus(user._id, { state: "sending" });
        try {
            await sendFriendRequest(user._id);
            setStatus(user._id, {
                state: "sent",
                text: `Request sent to ${user.username}. They'll see it under Add > Requests.`,
            });
        } catch (err) {
            setStatus(user._id, {
                state: "error",
                text: err.response?.data?.message || "Couldn't send the request. Try again.",
            });
        }
    };

    // Search for matching usernames.
    const handleSearch = async () => {

        // Don't search for an empty string.
        if (!searchText.trim()) {
            setResults([]);
            return;
        }

        try {
            setHasSearched(true);

            const users = await searchUsers(searchText);

            setResults(users);

        } catch (err) {
            console.error(err);
        }
    };
    /*
     * Wait until the user stops typing for
     * 100 milliseconds before searching.
     *
     * This prevents sending an API request for
     * every single key press.
     */
    useEffect(() => {

        // Clear results when the search box becomes empty.
        if (!searchText.trim()) {
            setResults([]);
            return;
        }

        // Schedule a search after 100 ms.
        const timer = setTimeout(() => {
            handleSearch();
        }, 200);

        /*
         * If another key is pressed before the
         * timer expires, cancel the previous search
         * and start a new timer.
         */
        return () => clearTimeout(timer);

    }, [searchText]);
    return (
        <div style={{ display: "grid", gap: "10px" }}>

            <h2>Find people</h2>

            <div className="search-row"><input
                type="text"
                value={searchText}
                onChange={(e) =>
                    setSearchText(e.target.value)
                }
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        handleSearch();
                    }
                }}
                placeholder="Search username..."
            />

            <button className="blue" onClick={handleSearch}>
                Search
            </button></div>
            {!hasSearched ? (
                <p className="muted">Type a username to find someone.</p>
            ) : results.length === 0 ? (
                <p className="muted">Nobody by that name.</p>
            ) : (
                results.map((user) => (
                    <div key={user._id} className="row" style={{ cursor: "default", flexWrap: "wrap" }}>
                        <Avatar name={user.username} />
                        <div className="grow">
                            <div className="name">{user.username}</div>
                            <small>{user.email}</small>
                        </div>

                        <button
                            className="small pink"
                            disabled={["sending", "sent"].includes(requestStatus[user._id]?.state)}
                            onClick={() => handleAdd(user)}
                        >
                            {{ sending: "Sending...", sent: "Sent", error: "Retry" }[requestStatus[user._id]?.state] ?? "Add"}
                        </button>
                        {requestStatus[user._id]?.text && (
                            <p
                                role="status"
                                className={requestStatus[user._id].state === "error" ? "error" : "ok"}
                                style={{ flexBasis: "100%", fontSize: "0.85rem" }}
                            >
                                {requestStatus[user._id].text}
                            </p>
                        )}
                    </div>
                ))
            )}

        </div>
    );
}

export default SearchUsers;