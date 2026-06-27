import express from 'express'; // Import the Express library
import cookieParser from 'cookie-parser'; // Import the cookie-parser middleware
import dotenv from 'dotenv'; // Import the dotenv library to load environment variables
import authRoutes from './routes/auth.route.js'; // Import the auth routes
import messageRoutes from './routes/message.route.js'; // Import the message routes
import { connectDB } from './lib/db.js'; // Import the database connection function


dotenv.config(); // Load environment variables from .env file


const app = express(); // Create an instance of the Express application
const PORT = process.env.PORT || 3000; // Get the port from environment variables or default to 3000

app.use(express.json({ limit: "5MB" })); // Middleware to parse JSON request bodies, increasing the payload limit from 500kb to 5MB
app.use(cookieParser()); // Middleware to parse cookies from incoming requests


app.use("/api/auth", authRoutes); // Use the auth routes for routes starting with /api/auth
app.use("/api/messages", messageRoutes); // Use the message routes for routes starting with /api/messages
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB(); // Connect to the database when the server starts
});


