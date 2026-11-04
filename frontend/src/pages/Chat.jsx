import { useEffect, useState } from "react";
import { getMessages, sendMessage, } from "../api/messages";
import { verify, logout } from "../api/auth";
import { getFriends } from "../api/friends";
import { getGroups, getInvites, acceptInvite, declineInvite, createGroup, getGroupMessages, sendGroupMessage, leaveGroup } from "../api/groups";
import GroupList from "../components/GroupList";
import { getPlans, createPlan, detectPlan, rsvpPlan } from "../api/plans";
import { useNavigate, } from "react-router-dom";
import MessageInput from "../components/MessageInput";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { socket } from "../api/socket";

import SearchUsers from "../components/SearchUsers";
import FriendRequests from "../components/FriendRequests";
import PaperPlane from "../components/PaperPlane";
import ThemeToggle from "../components/ThemeToggle";
import WordleGame from "../components/WordleGame";
import SessionHistory from "../components/SessionHistory";


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
    const [groups, setGroups] = useState([]);
    // Rooms the user was asked to join and hasn't answered yet.
    const [invites, setInvites] = useState([]);
    // At most one of selectedUser / selectedGroup is set at a time.
    const [selectedGroup, setSelectedGroup] = useState(null);
    // Open Plan cards for the selected group.
    const [plans, setPlans] = useState([]);
    const [planNotice, setPlanNotice] = useState("");
    const [tab, setTab] = useState("crew");
    // The game open in the main panel (null = the chat).
    const [game, setGame] = useState(null);
    // Showing the selected room's game history instead of its chat.
    const [showHistory, setShowHistory] = useState(false);
    // Reminders pushed by the server ("Game night starts in 5 minutes").
    const [reminders, setReminders] = useState([]);
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
        loadGroups();
        getInvites().then(setInvites).catch(() => {});
    }, []);

    /*
     * Group events. The server keeps each socket subscribed to its
     * groups' rooms, so these arrive for every group the user is in.
     */
    useEffect(() => {
        const handleGroupMessage = (message) => {
            if (selectedGroup && message.groupId === selectedGroup._id) {
                setMessages((prev) => [...prev, message]);
            }
            // Move the active group to the top of the list.
            setGroups((prev) => {
                const group = prev.find((g) => g._id === message.groupId);
                return group ? [group, ...prev.filter((g) => g !== group)] : prev;
            });
        };
        const handleGroupAdded = (group) =>
            setGroups((prev) => (prev.some((g) => g._id === group._id) ? prev : [group, ...prev]));
        const handleGroupInvite = (invite) => {
            setInvites((prev) => (prev.some((i) => i._id === invite._id) ? prev : [invite, ...prev]));
            setTab("rooms");
        };
        const handleGroupUpdated = (group) => {
            setGroups((prev) => prev.map((g) => (g._id === group._id ? group : g)));
            setSelectedGroup((current) => (current?._id === group._id ? group : current));
        };
        const handleGroupRemoved = ({ groupId }) => {
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            setSelectedGroup((current) => {
                if (current?._id !== groupId) return current;
                setMessages([]);
                return null;
            });
        };

        /*
         * Plan cards are live: the server emits plan:new when a card is
         * created (by a member or by the AI) and plan:update on every
         * RSVP, vote or edit.
         */
        const handlePlan = (plan) => {
            if (selectedGroup && plan.groupId === selectedGroup._id) applyPlan(plan);
        };

        const handleReminder = (reminder) =>
            setReminders((prev) => [...prev.filter((r) => r.planId !== reminder.planId), reminder]);

        socket.on("plan:reminder", handleReminder);
        socket.on("plan:new", handlePlan);
        socket.on("plan:update", handlePlan);
        socket.on("newGroupMessage", handleGroupMessage);
        socket.on("groupAdded", handleGroupAdded);
        socket.on("groupInvite", handleGroupInvite);
        socket.on("groupUpdated", handleGroupUpdated);
        socket.on("groupRemoved", handleGroupRemoved);
        return () => {
            socket.off("plan:reminder", handleReminder);
            socket.off("plan:new", handlePlan);
            socket.off("plan:update", handlePlan);
            socket.off("newGroupMessage", handleGroupMessage);
            socket.off("groupAdded", handleGroupAdded);
            socket.off("groupInvite", handleGroupInvite);
            socket.off("groupUpdated", handleGroupUpdated);
            socket.off("groupRemoved", handleGroupRemoved);
        };
    }, [selectedGroup]);

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

    const loadGroups = async () => {
        try {
            setGroups(await getGroups());
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateGroup = async (name, memberIds) => {
        const group = await createGroup(name, memberIds);
        setGroups((prev) => [group, ...prev]);
        openGroup(group);
    };

    const handleAcceptInvite = async (groupId) => {
        const group = await acceptInvite(groupId);
        setInvites((prev) => prev.filter((i) => i._id !== groupId));
        setGroups((prev) => (prev.some((g) => g._id === group._id) ? prev : [group, ...prev]));
        openGroup(group);
    };

    const handleDeclineInvite = async (groupId) => {
        await declineInvite(groupId);
        setInvites((prev) => prev.filter((i) => i._id !== groupId));
    };

    const openGroup = async (group) => {
        setShowHistory(false);
        setSelectedUser(null);
        setSelectedGroup(group);
        setMessages([]);
        setPlans([]);
        setPlanNotice("");
        try {
            const [history, openPlans] = await Promise.all([
                getGroupMessages(group._id),
                getPlans(group._id),
            ]);
            setMessages(history);
            setPlans(openPlans);
        } catch (err) {
            console.error(err);
        }
    };

    // Inserts, replaces or (when cancelled) removes a plan in the list.
    const applyPlan = (plan) => {
        setPlans((prev) => {
            const rest = prev.filter((p) => p._id !== plan._id);
            if (plan.status !== "open") return rest;
            const exists = prev.some((p) => p._id === plan._id);
            return exists ? prev.map((p) => (p._id === plan._id ? plan : p)) : [plan, ...rest];
        });
    };

    const handleFindPlan = async () => {
        if (!selectedGroup) return;
        setPlanNotice("Reading the chat...");
        try {
            const plan = await detectPlan(selectedGroup._id);
            if (plan) applyPlan(plan);
            setPlanNotice(plan ? "" : "No new plan spotted in the recent messages.");
        } catch (err) {
            setPlanNotice(err.response?.data?.message || "Couldn't check for a plan.");
        }
    };

    // Answer a reminder from its toast: "still on?" is just an RSVP.
    const answerReminder = async (reminder, status) => {
        try {
            const plan = await rsvpPlan(reminder.planId, status);
            if (selectedGroup && plan.groupId === selectedGroup._id) applyPlan(plan);
        } catch (err) {
            console.error(err);
        }
        setReminders((prev) => prev.filter((r) => r.planId !== reminder.planId));
    };

    const handleCreatePlan = async (fields) => {
        if (!selectedGroup) return;
        // Errors propagate to the form, which shows them.
        applyPlan(await createPlan(selectedGroup._id, fields));
    };

    const handleLeaveGroup = async () => {
        if (!selectedGroup || !currentUser) return;
        try {
            await leaveGroup(selectedGroup._id, currentUser._id);
            setGroups((prev) => prev.filter((g) => g._id !== selectedGroup._id));
            setSelectedGroup(null);
            setMessages([]);
        } catch (err) {
            console.error(err);
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
        if (!selectedUser && !selectedGroup) return;

        try {

            /*
             * POST the message to the backend.
             */
            const createdMessage = selectedGroup
                ? await sendGroupMessage(selectedGroup._id, newMessage)
                : await sendMessage(selectedUser._id, newMessage);

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
        return <div className="auth-page"><h2>Warming up the engines...</h2></div>;
    }

    if (error) {
        return <div className="auth-page"><h2 className="error">{error}</h2></div>;
    }

    const hasChat = selectedUser || selectedGroup;

    return (
        <div className="shell">
            <header className="topbar panel">
                <div className="brand">
                    <PaperPlane size={34} />
                    <span className="brand-name">Chit-Chat</span>
                </div>
                <div className="actions">
                    {currentUser && <span className="who">{currentUser.username}</span>}
                    <ThemeToggle />
                    <button className="small plain" onClick={handleLogout}>
                        Log out
                    </button>
                </div>
            </header>

            <div className="main">
                <aside className="rail panel">
                    <nav className="tabs">
                        {[
                            ["crew", "Crew"],
                            ["rooms", "Rooms"],
                            ["games", "Games"],
                            ["add", "Add"],
                        ].map(([id, label]) => (
                            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
                                {label}
                            </button>
                        ))}
                    </nav>
                    <div className="rail-body">
                        {tab === "crew" && (
                            <Sidebar
                                friends={friends}
                                selectedUser={selectedUser}
                                onlineUsers={onlineUsers}
                                onSelectFriend={(friend) => {
                                    setGame(null);
                                    setShowHistory(false);
                                    setSelectedGroup(null);
                                    setSelectedUser(friend);
                                    loadMessages(friend._id);
                                }}
                            />
                        )}
                        {tab === "rooms" && (
                            <GroupList
                                groups={groups}
                                invites={invites}
                                onAccept={handleAcceptInvite}
                                onDecline={handleDeclineInvite}
                                friends={friends}
                                selectedGroup={selectedGroup}
                                onSelectGroup={(g) => {
                                    setGame(null);
                                    openGroup(g);
                                }}
                                onCreateGroup={handleCreateGroup}
                            />
                        )}
                        {tab === "games" && (
                            <div style={{ display: "grid", gap: "10px" }}>
                                <h2>Games</h2>
                                <div
                                    className={game === "wordle" ? "row selected" : "row"}
                                    onClick={() => setGame("wordle")}
                                >
                                    <span className="avatar" style={{ background: "#7ae582" }}>W</span>
                                    <div className="grow">
                                        <div className="name">Word of the day</div>
                                        <small>Daily. Compare with your crew.</small>
                                    </div>
                                </div>
                                <p className="muted">More games are coming.</p>
                            </div>
                        )}
                        {tab === "add" && (
                            <>
                                <SearchUsers />
                                <FriendRequests />
                            </>
                        )}
                    </div>
                </aside>

                <section className="convo panel">
                    {game === "wordle" ? (
                        <WordleGame groups={groups} currentUser={currentUser} />
                    ) : showHistory && selectedGroup ? (
                        <SessionHistory
                            group={selectedGroup}
                            plans={plans}
                            currentUser={currentUser}
                            onBack={() => setShowHistory(false)}
                        />
                    ) : (
                        <>
                            <ChatWindow
                                selectedUser={selectedUser}
                                selectedGroup={selectedGroup}
                                messages={messages}
                                currentUser={currentUser}
                                onLeaveGroup={handleLeaveGroup}
                                plans={plans}
                                onPlanChange={applyPlan}
                                onFindPlan={handleFindPlan}
                                onCreatePlan={handleCreatePlan}
                                onOpenHistory={() => setShowHistory(true)}
                                planNotice={planNotice}
                            />
                            <MessageInput
                                value={newMessage}
                                onChange={setNewMessage}
                                onSend={handleSendMessage}
                                disabled={!hasChat}
                            />

                        </>
                    )}
                </section>
            </div>

            {reminders.length > 0 && (
                <div className="toasts" role="status">
                    {reminders.map((r) => (
                        <div className="toast" key={r.planId}>
                            <strong>{r.title}</strong>
                            <span>
                                {r.stage === "m5" ? "starts in about 5 minutes" : `starts in about ${r.minutes} minutes`}. Still on?
                            </span>
                            <div className="toast-actions">
                                <button className="small lime" onClick={() => answerReminder(r, "going")}>Going</button>
                                <button className="small plain" onClick={() => answerReminder(r, "out")}>Can't</button>
                                {r.meetLink && (
                                    <a className="btn small blue" href={r.meetLink} target="_blank" rel="noopener noreferrer">Join call</a>
                                )}
                                <button className="small plain" onClick={() => setReminders((prev) => prev.filter((x) => x.planId !== r.planId))}>
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Chat;

