import jwt from 'jsonwebtoken'; // Import the jsonwebtoken library for generating JWT tokens

// Function to generate a JWT token for a user
export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { 
        expiresIn: '7d' }); // Generate a token with the user's ID, secret key, and expiration time of 7 days
    res.cookie('jwt', token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,    //ms
        httpOnly: true, 
        sameSite: 'strict', // Set the cookie to be sent only in requests from the same site, cross-site requests will not include the cookie
        secure: process.env.NODE_ENV === 'production' // Set the cookie to be sent only over HTTPS in production, for development it can be false
    }); // Set the token as an HTTP-only cookie, only doing development for now, in production it should be set to true to ensure the cookie is only sent over HTTPS
    return token; // Return the generated token
}