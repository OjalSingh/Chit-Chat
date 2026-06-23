import express from 'express'; // Import the Express library
import dotenv from 'dotenv'; // Import the dotenv library to load environment variables
import authRoutes from './routes/auth.route.js'; // Import the auth routes
import messageRoutes from './routes/message.route.js'; // Import the message routes

dotenv.config(); // Load environment variables from .env file


const app = express(); // Create an instance of the Express application
const PORT = process.env.PORT || 3000; // Get the port from environment variables or default to 3000



app.use("/api/auth", authRoutes); // Use the auth routes for routes starting with /api/auth
app.use("/api/messages", messageRoutes); // Use the message routes for routes starting with /api/messages
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


