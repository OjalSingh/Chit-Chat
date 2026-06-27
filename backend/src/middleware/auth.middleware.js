import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Import the User model
import { ENV } from '../lib/env.js'; // Import the environment variables

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt; // Get the JWT token from the cookies

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, token missing' });
        }

        const decoded = jwt.verify(token, ENV.JWT_SECRET); // Verify the token using the secret key 
        if(!decoded) {
            return res.status(401).json({ message: 'Not authorized, token invalid' });
        }

        const user = await User.findById(decoded.userId).select('-password'); // Find the user by ID from the decoded token
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user; // Attach the user object to the request for further use
        next();

    } catch (error) {
        console.log("Error in protectRoute middleware:", error);
        return res.status(500).json({ message: 'Server Error' });

    }
}