import { useState, useEffect } from "react";
import { searchUsers, sendFriendRequest } from "../api/friends";


function SearchUsers() {

    // Stores whatever the user types into the search box.

    const [searchText, setSearchText] = useState("");

    // Stores the users returned by the backend.
    const [results, setResults] = useState([]);

    // Stores if the user has searched and what it has searched
    const [hasSearched, setHasSearched] = useState(false);

    // Stores status of pending requests
    const [pendingRequests, setPendingRequests] = useState([]);

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
        <div>

            <h2>Search Users</h2>

            <input
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

            <button onClick={handleSearch}>
                Search
            </button>
            {!hasSearched ? (
                <p>Search for a user...</p>
            ) : results.length === 0 ? (
                <p>No users found.</p>
            ) : (
                results.map((user) => (
                    <div
                        key={user._id}
                        style={{
                            border: "1px solid gray",
                            padding: "10px",
                            marginBottom: "8px",
                        }}
                    >
                        <strong>{user.username}</strong>

                        <br />

                        {user.email}

                        <br />
                        <br />

                        <button
                            disabled={pendingRequests.includes(user._id)}
                            onClick={async () => {
                                try {
                                    await sendFriendRequest(user._id);

                                    setPendingRequests((prev) => [
                                        ...prev,
                                        user._id,
                                    ]);

                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                        >
                            {pendingRequests.includes(user._id)
                                ? "Pending"
                                : "Add Friend"}
                        </button>

                    </div>
                ))
            )}

        </div>
    );
}

export default SearchUsers;