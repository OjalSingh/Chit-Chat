# ChitChat 

> **A backend-first real-time messaging platform demonstrating scalable hybrid REST + WebSocket architecture, secure authentication, and event-driven state synchronization.**

---

# Table of Contents

1. Overview
2. Tech Stack
3. System Architecture
4. Architectural Design Pattern
5. Core Features
6. Security
7. Design Decisions
8. System Event Flow
9. Project Structure
10. Running Locally
11. Environment Variables
12. API Documentation
13. Database Schema Deep Dive
14. Engineering Highlights
15. Future Extensions & Scaling Strategy

---

# Overview

ChitChat is a full-stack real-time messaging application built to explore production-inspired backend architecture rather than simply implementing a chat interface.

The project emphasizes:

- Secure authentication and authorization
- Event-driven communication using Socket.IO
- Hybrid HTTP + WebSocket synchronization
- Clean separation of REST and real-time responsibilities
- Modular Express architecture
- MongoDB data modeling
- Scalable system design principles

Unlike many beginner chat applications that rely entirely on WebSockets, ChitChat deliberately separates **persistent business operations** from **real-time UI synchronization**, closely mirroring the architecture used in modern production systems.

---
# Tech Stack

### Backend

- Node.js
- Express.js
- Socket.IO
- MongoDB
- Mongoose
- JWT Authentication
- Cookie-based Sessions
- Arcjet Middleware

### Frontend

- React
- Vite
- Native React Hooks
- Lightweight Component Architecture

---

# Architecture

```
                    +----------------+
                    | React (Vite)   |
                    +----------------+
                          │
          ┌───────────────┴───────────────┐
          │                               │
      HTTP REST                     WebSockets
  (Authoritative State)          (Live Events)
          │                               │
          └───────────────┬───────────────┘
                          │
                Express + Socket.IO Server
                          │
             Authentication Middleware
                          │
                MongoDB (Persistent Store)
```

---

# Architectural Design Pattern

## Hybrid REST + WebSocket Event Model

Rather than treating WebSockets as the source of truth, ChitChat follows a **hybrid communication model**.

### REST Responsibilities

REST endpoints own every persistent business operation.

Examples include:

- Login
- Registration
- User search
- Friend requests
- Accepting requests
- Rejecting requests
- Sending messages
- Loading conversations

Every mutation first succeeds inside MongoDB before any real-time event is emitted.

This guarantees:

- Atomic writes
- Database consistency
- Retry safety
- Easier debugging
- Predictable API behavior

---

### WebSocket Responsibilities

Socket.IO is responsible only for synchronizing connected clients.

Examples include:

- Incoming messages
- Friend request notifications
- Presence updates
- Friend list refreshes
- Live online indicators

The socket layer never replaces persistence—it simply mirrors successful backend state changes.

This significantly reduces unnecessary HTTP polling while maintaining data integrity.

---

# Core Features

## Authentication & Route Protection

- JWT-based authentication
- Cookie-backed session handling
- Protected REST endpoints
- Socket.IO handshake authentication
- Shared middleware between HTTP and WebSocket layers

---

## Live Presence Tracking

Every authenticated socket is registered inside a lightweight server-side connection registry.

```text
userSocketMap

UserID
    ↓
SocketID
```

Whenever a client connects or disconnects:

- Active socket registry updates
- Online user list is recalculated
- Presence events are broadcast to every connected client

The frontend instantly reflects:

- Online users
- Offline users
- Live green status indicators

without polling.

---

## Real-Time Friendship Workflow

Friendship follows a production-inspired event pipeline.

Operations:

- Search users
- Send request
- Receive request instantly
- Accept request
- Reject request
- Automatically refresh friend roster

Each action first commits through REST before broadcasting lightweight socket events.

---

## Real-Time Messaging

Messages are persisted before being emitted.

Flow:

1. Validate request
2. Store message
3. Check recipient connection
4. Emit socket event
5. Receiver updates conversation instantly

This guarantees that every displayed message already exists in persistent storage.

---

# Security

Current security layers include:

- JWT verification
- Protected middleware
- Socket authentication
- Cookie validation
- Arcjet request protection
- API rate limiting
- Route authorization
- Server-side validation

The backend never trusts client state.

Every protected operation derives identity directly from authenticated middleware.

---

# Design Decisions

## Why a Hybrid REST + WebSocket Architecture?

Persistent operations such as authentication, friend management, and messaging are handled through REST endpoints to ensure atomic database writes, predictable error handling, and reliable API semantics. Once a mutation has been successfully committed, Socket.IO broadcasts lightweight events to synchronize connected clients in real time.

This separation establishes REST as the authoritative source of truth while WebSockets remain responsible solely for UI synchronization.

## Why MongoDB?

MongoDB's document model naturally represents users, friendships, and conversations while allowing flexible schema evolution as new features are introduced.

ObjectId references are used to model relationships, with population performed only when necessary to reduce unnecessary data transfer.


## Why a Separate FriendRequest Collection?

Instead of embedding pending requests inside each User document, friend requests are stored independently.

This approach:

- Prevents unbounded growth of user documents.
- Enables efficient querying of pending requests.
- Supports clear request lifecycles (Pending → Accepted/Rejected).
- Makes future features such as request history and expiration easier to implement.


## Why Socket Authentication?

Both REST endpoints and Socket.IO connections share the same authentication model.

Every socket connection passes through authentication middleware before joining the application, ensuring only verified users can receive presence updates, notifications, and live messages.

## Why Arcjet?

Traditional Express middleware such as rate limiters primarily protect individual endpoints after requests have already reached the application. Arcjet provides an additional security layer by applying centralized protection policies before requests are processed, helping mitigate common abuse patterns with minimal application code.

Arcjet is used to:

- Apply request rate limiting to sensitive endpoints.
- Reduce automated abuse such as bot traffic and repeated authentication attempts.
- Keep security policies centralized rather than scattering validation logic across controllers.
- Allow the application to focus on business logic while infrastructure-level concerns are handled by dedicated middleware.

This separation improves maintainability, simplifies future security enhancements, and reflects a production-oriented approach to backend API design.


## Why Maintain a Server-side Socket Registry?

The application maintains an in-memory `userSocketMap` that associates authenticated user IDs with active Socket.IO connections.

This enables:

- Instant message delivery
- Friend request notifications
- Presence broadcasting
- Efficient targeted event emission

without requiring unnecessary database lookups for every event.

---

# System Event Flow

## Friend Request Lifecycle

```text
User A

│
│ Click "Add Friend"
▼

POST /friends/request/:userId

│
▼

Backend Validation

• User exists
• Not self
• No duplicate request
• Authentication verified

│
▼

MongoDB

Create FriendRequest

│
▼

Successful Database Commit

│
▼

Lookup receiver socket

userSocketMap

│
▼

Socket.IO

Emit:

friendRequestReceived

│
▼

User B

Instant UI update

(No refresh required)
```

---

# Presence Flow

```text
Client Connects

↓

Socket Authentication

↓

Store

userId → socketId

↓

Broadcast

getOnlineUsers

↓

All clients update
presence indicators
```

---

# Project Structure

```text
backend/
└──src
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── lib/
    │     ├── socket.js
    │     ├── env.js
    │     ├── arcjet.js
    │     ├── utils.js
    │     └── db.js
    ├── app.js
    └── server.js

frontend/
├── components/
├── pages/
├── api/
├── hooks/
└── App.jsx
```

The project follows clear separation between:

- Models
- Controllers
- Middleware
- Routes
- Socket infrastructure

keeping responsibilities isolated and maintainable.

---

# Running Locally

### Prerequisites

- Node.js 20+
- MongoDB
- npm

### Clone

```bash
git clone <repo-url>
cd chit-chat
```

### Backend

```bash
cd backend
npm install
```

Create a `.env`

```env
PORT=3000
MONGO_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
ARCJET_KEY=
```

Run

```bash
npm run dev
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend

```
http://localhost:5173
```

Backend

```
http://localhost:3000
```

---
## Environment Variables

| Variable   | Purpose             |
|------------|-------------------- |
| PORT       | Express server      |
| MONGO_URI  | MongoDB connection  |
| JWT_SECRET | Authentication      |
| CLIENT_URL | Socket.IO CORS      |
| ARCJET_KEY | Security middleware |

---
# API Documentation

## Authentication

| Method | Endpoint           | Description                                                     |
| ------ | ------------------ | --------------------------------------------------------------- |
| POST   | `/api/auth/signup` | Register a new user account.                                    |
| POST   | `/api/auth/login`  | Authenticate a user and establish a session.                    |
| POST   | `/api/auth/logout` | Terminate the current authenticated session.                    |
| GET    | `/api/auth/verify` | Verify the current authenticated user and return their profile. |


## Friends

| Method | Endpoint                               | Description                                    |
| ------ | -------------------------------------- | ---------------------------------------------- |
| GET    | `/api/friends/search?username=<query>` | Search for users by username.                  |
| GET    | `/api/friends/requests`                | Retrieve all pending incoming friend requests. |
| GET    | `/api/friends`                         | Retrieve the authenticated user's friend list. |
| POST   | `/api/friends/request/:userId`         | Send a friend request to another user.         |
| PATCH  | `/api/friends/accept/:requestId`       | Accept a pending friend request.               |
| PATCH  | `/api/friends/reject/:requestId`       | Reject a pending friend request.               |


# Messages

| Method | Endpoint                 | Description                                                                   |
| ------ | ------------------------ | ----------------------------------------------------------------------------- |
| GET    | `/api/messages/chats`    | Retrieve all users with whom the authenticated user has active conversations. |
| GET    | `/api/messages/:id`      | Retrieve the complete conversation with a specific user.                      |
| POST   | `/api/messages/send/:id` | Send a text or image message to a specific user.                              |


### All endpoints were tested using the Thunder Client extension for Visual Studio Code during development.
---

# Database Schema Deep Dive

## User
```text
User
├── username
├── email
├── password
└── friends[]
```
### Significance
- Authentication data remains centralized.
- Friends are stored as ObjectId references.
- Population is performed only when required, reducing unnecessary document size.

## FriendRequest
FriendRequest
├── sender
├── receiver
├── status
├── createdAt


### Significance

Instead of embedding pending requests inside the User document, friend requests are modeled independently because:
- avoids unbounded array growth
- supports querying pending requests efficiently
- enables audit/history if desired
- clean lifecycle (pending → accepted/rejected)

## Message
Message
├── senderId
├── receiverId
├── text
├── image
├── createdAt

### Significance

Messages remain immutable and append-only.
Conversation history is reconstructed using
senderId == A && receiverId == B
OR
senderId == B && receiverId == A
This keeps writes extremely simple.

---

# Engineering Highlights

Rather than showcasing only CRUD operations, ChitChat demonstrates practical backend engineering concepts including:

- Hybrid REST + WebSocket architecture
- JWT authentication shared across HTTP and Socket.IO
- Event-driven synchronization
- Real-time presence systems
- Connection lifecycle management
- Secure middleware pipelines
- MongoDB relationship modeling
- Modular Express architecture
- Production-oriented scalability planning
- Clean separation between persistence and real-time communication
---

# Future Extensions

- Redis Pub/Sub for multi-server Socket.IO synchronization
- Horizontal load balancing
- JWT refresh token rotation
- End-to-end encrypted messaging
- Read receipts
- Typing indicators
- Message pagination
- Multi-device session synchronization
- Push notifications
- Media uploads via Cloudinary

---
