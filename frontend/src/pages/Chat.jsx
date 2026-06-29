import { useEffect, useState } from "react";
import { getFriends, getMessages, sendMessage, } from "../api/messages";
import { verify } from "../api/auth";
import { logout } from "../api/auth";
import { useNavigate } from "react-router-dom";
import MessageInput from "../components/MessageInput";
import  Sidebar  from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { socket } from "../api/socket";


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

        socket.on("newMessage", (message) => {

            /*
             * Add the incoming message to the current
             * conversation without making another HTTP request.
             */
            setMessages((prev) => [...prev, message]);
        });

        /*
         * Remove the listener when this component unmounts.
         * Prevents duplicate listeners if the user leaves
         * and returns to the chat page.
         */
        return () => {
            socket.off("newMessage");
        };

    }, []);

    const handleLogout = async () => {
        try {
            socket.disconnect();

            await logout();

            navigate("/login");

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
            <Sidebar
                friends={friends}
                selectedUser={selectedUser}
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

//  <h2>Friends</h2>

//             {friends.length === 0 ? (
//                 <p>No users found.</p>
//             ) : (
//                 friends.map((friend) => {

//                     /*
//                      * Compare the current friend with the selected
//                      * conversation so we can highlight it.
//                      */
//                     const isSelected =
//                         selectedUser?._id === friend._id;

//                     return (
//                         <div
//                             key={friend._id}
//                             onClick={() => {
//                                 setSelectedUser(friend);
//                                 loadMessages(friend._id);
//                             }}
//                             style={{
//                                 border: isSelected
//                                     ? "2px solid blue"
//                                     : "1px solid gray",

//                                 backgroundColor: isSelected
//                                     ? "#dbeafe"
//                                     : "white",

//                                 padding: "10px",
//                                 marginBottom: "8px",
//                                 cursor: "pointer",

//                                 /*
//                                  * Small transition makes selection feel nicer
//                                  * without adding any real styling complexity.
//                                  */
//                                 transition: "0.2s",
//                             }}
//                         >
//                             <strong>{friend.username}</strong>

//                             <br />

//                             {friend.email}
//                         </div>
//                     );
//                 })
//             )}

//             <hr />

//             <h2>Conversation</h2>

//             {selectedUser ? (
//                 <>
//                     <p>
//                         Chatting with <strong>{selectedUser.username}</strong>
//                     </p>

//                     {messages.length === 0 ? (
//                         <p>No messages yet.</p>
//                     ) : (
//                         messages.map((message) => {

//                             const isMine =
//                                 currentUser &&
//                                 message.senderId === currentUser._id;

//                             return (
//                                 <div
//                                     key={message._id}
//                                     style={{
//                                         border: "1px solid gray",
//                                         padding: "8px",
//                                         marginBottom: "8px",

//                                         /*
//                                          * For now we simply align messages differently.
//                                          * Later Socket.IO and CSS can improve this.
//                                          */
//                                         textAlign: isMine ? "right" : "left",
//                                     }}
//                                 >
//                                     <strong>
//                                         {isMine ? "You" : selectedUser.username}
//                                     </strong>

//                                     <br />

//                                     {message.text}
//                                 </div>
//                             );
//                         })
//                     )}
//                 </>
//             ) : (
//                 <p>Select a friend.</p>
//             )}

//             <hr />

//             <h2>New Message</h2>

//             <input
//                 type="text"
//                 value={newMessage}
//                 onChange={(e) => setNewMessage(e.target.value)}

//                 /*
//                 * Pressing Enter provides the same behavior
//                 * as clicking the Send button.
//                 */
//                 onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                         handleSendMessage();
//                     }
//                 }}

//                 placeholder="Type a message..."
//                 style={{
//                     width: "300px",
//                 }}
//             />

//             <button
//                 onClick={handleSendMessage}
//             >
//                 Send
//             </button>
