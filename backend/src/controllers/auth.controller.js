import User from '../models/User.js'; // Import the User model
import bcrypt from 'bcryptjs'; // Import the bcrypt library for password hashing
import { generateToken } from '../lib/utils.js'; // Import the generateToken function from utils.js

export const signup = async  (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        if(password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // using regex to validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Check if the user already exists
        const user = await User.findOne({ email });
        if(user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hashing the password before saving it to the database
        const salt = await bcrypt.genSalt(10); // Generate a salt for hashing salt means a random string that is added to the password before hashing to make it more secure
        const hashedPassword = await bcrypt.hash(password, salt); // Hash the password with the generated salt

        // Create a new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword // Save the hashed password instead of the plain text password
        });

        if (newUser) {
            const savedUser = await newUser.save(); // Save the new user to the database
            generateToken(newUser.id, res); // Generate a token for the new user and send it in the response
            await newUser.save();

            res.status(201).json({
                _id: newUser.id,
                username: newUser.username,
                email: newUser.email
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
        

    } catch (error) {
        console.log("Error in signup controller:", error);
        res.status(500).json({ message: 'Server error' });
    }
        
};