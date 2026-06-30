import { useEffect, useState } from "react";
import {
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
} from "../api/friends";

import { socket } from "../api/socket";

function FriendRequests() {

    const [requests, setRequests] = useState([]);

    /*
     * Load all pending requests from backend
     */
    const loadRequests = async () => {
        try {
            const data = await getFriendRequests();
            setRequests(data);
        } catch (err) {
            console.error(err);
        }
    };

    /*
     * Initial fetch
     */
    useEffect(() => {
        loadRequests();
    }, []);

    // REAL-TIME SOCKET LISTENERS
    useEffect(() => {

        /*
         * New friend request received instantly
         */
        socket.on("friendRequestReceived", (request) => {
            setRequests((prev) => {
                // avoid duplicates
                const exists = prev.some(r => r._id === request._id);
                if (exists) return prev;
                return [request, ...prev];
            });
        });

        /*
         * When request is accepted/rejected elsewhere
         * refresh full list for consistency
         */
        socket.on("friendRequestUpdated", () => {
            loadRequests();
        });

        return () => {
            socket.off("friendRequestReceived");
            socket.off("friendRequestUpdated");
        };

    }, []);

    /*
     * ACCEPT REQUEST
     */
    const handleAccept = async (id) => {
        try {
            await acceptFriendRequest(id);
            await loadRequests(); // refresh UI
        } catch (err) {
            console.error(err);
        }
    };

    /*
     * REJECT REQUEST
     */
    const handleReject = async (id) => {
        try {
            await rejectFriendRequest(id);
            await loadRequests(); // refresh UI
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <h2>Friend Requests</h2>

            {requests.length === 0 ? (
                <p>No pending requests.</p>
            ) : (
                requests.map((request) => (
                    <div
                        key={request._id}
                        style={{
                            border: "1px solid gray",
                            padding: "10px",
                            marginBottom: "8px",
                        }}
                    >
                        <strong>
                            {request.sender.username}
                        </strong>

                        <br />
                        {request.sender.email}

                        <br />

                        <button
                            onClick={() =>
                                handleAccept(request._id)
                            }
                        >
                            Accept
                        </button>

                        <button
                            onClick={() =>
                                handleReject(request._id)
                            }
                            style={{ marginLeft: "10px" }}
                        >
                            Reject
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

export default FriendRequests;