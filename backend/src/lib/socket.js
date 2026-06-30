import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);
//socketServer
const io = new Server(server, {
    cors: {
        origin: ENV.CLIENT_URL,
        credentials: true,
    },
});
// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// this is for storing online users
const userSocketMap = {}; // key-val pairs {userId:socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.user.username)

    const userId = socket.userId
    userSocketMap[userId] = socket.id;

    //io.emit is used to send events to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    //Handle friend request sending
    socket.on("sendFriendRequest", ({ receiverId, request }) => {
        const receiverSocketId = userSocketMap[receiverId];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit(
                "friendRequestReceived",
                request
            );
        }
    });

    socket.on("friendRequestUpdated", ({ receiverId }) => {
        const receiverSocketId = userSocketMap[receiverId];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit(
                "friendRequestUpdated"
                );
            }
        });

        //socket.on to listen
        socket.on("disconnect", () => {
                console.log("A user disconnected", socket.user.username);
                delete userSocketMap[userId];
                io.emit("getOnlineUsers", Object.keys(userSocketMap));
            });
        });


        /*
         * Returns the Socket.IO socket ID associated with a user.
         * Message controllers use this to determine whether the
         * recipient is currently online before emitting events.
         */
        export const getReceiverSocketId = (userId) => {
            return userSocketMap[userId];
        };

        export { io, app, server }