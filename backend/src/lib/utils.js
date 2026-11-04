import jwt from 'jsonwebtoken'; // Import the jsonwebtoken library for generating JWT tokens

/*
 * Cookie attributes for the login cookie. Logout must clear it with the same
 * attributes, because browsers refuse to overwrite a Secure cookie with a
 * non-Secure one.
 */
export function cookieOptions() {
    const requested = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
    // 'strict' by default. Use COOKIE_SAMESITE=none when the frontend and the API are on different sites.
    const sameSite = ['strict', 'lax', 'none'].includes(requested) ? requested : 'strict';
    return {
        httpOnly: true,
        sameSite,
        // Browsers only accept SameSite=None cookies over HTTPS.
        secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    };
}

// Function to generate a JWT token for a user
export const generateToken = (userId, res) => {
    const JWT_SECRET = process.env.JWT_SECRET; // Get the secret key from environment variables

    if(!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {  expiresIn: '7d' }); // Generate a token with the user's ID, secret key, and expiration time of 7 days
    
    res.cookie('jwt', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 }); // ms
    // Set the token as an HTTP-only cookie, only doing development for now, in production it should be set to true to ensure the cookie is only sent over HTTPS
    
    return token; // Return the generated token
}