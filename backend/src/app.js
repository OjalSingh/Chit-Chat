import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app } from "./lib/socket.js";
import { ENV } from "./lib/env.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRoutes from "./routes/friend.route.js";
import groupRoutes from "./routes/group.route.js";

/*
 * Configures the Express app that Socket.IO's HTTP server wraps.
 * Kept apart from server.js so tests can import the app without
 * opening a port or connecting to the production database.
 */
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "5MB" })); // raise the JSON body limit from 100kb to 5MB for image payloads
app.use(cookieParser());

// Liveness probe for load balancers and deploy platforms.
app.get("/api/health", (_, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);

export default app;
