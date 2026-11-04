import Avatar from "./Avatar";
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
        <div style={{ display: "grid", gap: "10px" }}>
            <h2>Requests</h2>

            {requests.length === 0 ? (
                <p className="muted">No requests right now.</p>
            ) : (
                requests.map((request) => (
                    <div key={request._id} className="row" style={{ cursor: "default", flexWrap: "wrap" }}>
                        <Avatar name={request.sender.username} />
                        <div className="grow">
                            <div className="name">{request.sender.username}</div>
                            <small>{request.sender.email}</small>
                        </div>

                        <button
                            className="small lime"
                            onClick={() =>
                                handleAccept(request._id)
                            }
                        >
                            Accept
                        </button>

                        <button
                            className="small plain"
                            onClick={() =>
                                handleReject(request._id)
                            }
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