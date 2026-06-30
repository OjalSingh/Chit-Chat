import { io } from "socket.io-client";

/*
 * Socket instance shared across the application.
 * autoConnect is disabled so we only establish the
 * connection after a user has been authenticated.
 */
export const socket = io("http://localhost:3000", {
    withCredentials: true,
    autoConnect: false,
});

// logging to verify the socket lifecycle
socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Socket disconnected");
});

socket.on("connect_error", (err) => {
    console.error("Socket connection failed:", err.message);
});
