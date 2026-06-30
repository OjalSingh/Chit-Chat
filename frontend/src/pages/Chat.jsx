import { useEffect, useState } from "react";
import { getMessages, sendMessage, } from "../api/messages";
import { verify, logout } from "../api/auth";
import { getFriends } from "../api/friends";
import { useNavigate, } from "react-router-dom";
import MessageInput from "../components/MessageInput";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { socket } from "../api/socket";

import SearchUsers from "../components/SearchUsers";
import FriendRequests from "../components/FriendRequests";


function Chat() {

    /*
     * Chat.jsx acts as the controller for the chat page.
     * It owns all chat-related state and communicates with the backend.
     * Child components (Sidebar, ChatWindow, MessageInput) will later
     * receive this data as props and remain focused on rendering only.
     */


    /* The frontend does not trust local state to determine the authenticated 
     user. It queries a protected /auth/verify endpoint, which reuses the JWT 
     middleware and returns the authenticated user. This keeps authentication 
     centralized and avoids duplicating user identity logic.
    */

    const [currentUser, setCurrentUser] = useState(null);

    const [friends, setFriends] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [newMessage, setNewMessage] = useState("");
    // Stores the IDs of users currently connected to the Socket.IO server.
    const [onlineUsers, setOnlineUsers] = useState([]);


    useEffect(() => {
        loadCurrentUser();
        loadFriends();
    }, []);

    useEffect(() => {
        console.log("Friends state:", friends);
    }, [friends]);

    /*
     * Listen for messages pushed by the backend.
     * Whenever another user sends us a message,
     * the backend emits a "newMessage" event.
     */
    useEffect(() => {
    const handleNewMessage = (message) => {

        if (!selectedUser) return;

        const belongsToConversation =
            message.senderId === selectedUser._id ||
            message.receiverId === selectedUser._id;

        if (belongsToConversation) {
            setMessages(prev => [...prev, message]);
        }
    };

    socket.on("newMessage", handleNewMessage);

    return () => socket.off("newMessage", handleNewMessage);

}, [selectedUser]);
    useEffect(() => {
        /*
         * Ensure a socket connection exists whenever the
         * chat page is opened.
         */
        if (!socket.connected) {
            socket.connect();
        }

        socket.on("connect", () => {
            console.log("Connected:", socket.id);
        });

        return () => {
            // Disconnect when leaving the chat page.
            socket.disconnect();
        };
    }, []);

    // Listen for updates whenever users connect or disconnect.
    useEffect(() => {
        socket.on("getOnlineUsers", (users) => {
            console.log("ONLINE USERS EVENT:", users);
            setOnlineUsers(users);
        });

        return () => {
            socket.off("getOnlineUsers");
        };
    }, []);

    useEffect(() => {
        socket.on("friendRequestUpdated", () => {
            loadFriends();
        });

        return () => {
            socket.off("friendRequestUpdated");
        };
    }, []);


    const handleLogout = async () => {
        try {
            socket.disconnect();

            await logout();

            // After clearing the JWT cookie,
            // send the user back to the login page.
            navigate("/login");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const loadCurrentUser = async () => {
        try {
            const user = await verify();
            setCurrentUser(user);
        } catch (err) {
            console.error(err);
        }
    };


    const loadFriends = async () => {
        try {
            setLoading(true);
            setError("");

            const friendsList = await getFriends();
            console.log("Friends response:", friendsList);
            setFriends(friendsList);

        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to load friends."
            );

        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {

        /*
         * Prevent empty messages from reaching the backend.
         * The backend validates this as well, but validating
         * here avoids unnecessary network requests.
         */
        if (!newMessage.trim()) return;

        /*
         * A conversation must be selected before a message
         * can be sent.
         */
        if (!selectedUser) return;

        try {

            /*
             * POST the message to the backend.
             */
            const createdMessage = await sendMessage(
                selectedUser._id,
                newMessage
            );

            /*
             * Instead of requesting the whole conversation
             * again, immediately append the newly created
             * message returned by the API.
             *
             * This keeps the interface responsive and mirrors
             * what we'll later do with Socket.IO.
             */
            setMessages((prev) => [
                ...prev,
                createdMessage,
            ]);

            /*
             * Clear the textbox after a successful send.
             */
            setNewMessage("");

        } catch (err) {
            console.error(err);
        }
    };

    const loadMessages = async (userId) => {
        try {
            setError("");

            /*
             * Fetch the complete conversation between the
             * logged-in user and the selected friend.
             */
            const conversation = await getMessages(userId);

            setMessages(conversation);
            console.log(messages);

        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to load messages."
            );
        }
    };
    if (loading) {
        return <h2>Loading friends...</h2>;
    }

    if (error) {
        return <h2>{error}</h2>;
    }

    return (
        <div style={{ padding: "20px" }}>
            <h1>Chat</h1>
            <hr />
            <SearchUsers />
            <hr />
            <FriendRequests />

            <hr />
            <Sidebar
                friends={friends}
                selectedUser={selectedUser}
                onlineUsers={onlineUsers}
                onSelectFriend={(friend) => {
                    setSelectedUser(friend);
                    loadMessages(friend._id);
                }}
            />

            <hr />

            <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                currentUser={currentUser}
            />

            <hr />

            <MessageInput
                value={newMessage}
                onChange={setNewMessage}
                onSend={handleSendMessage}
            />


            <hr />
            <button onClick={handleLogout}>
                Logout
            </button>
        </div>

    );
}

export default Chat;

