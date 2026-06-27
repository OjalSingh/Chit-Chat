import 'dotenv/config'; // Load environment variables from .env file

export const ENV = {   
    PORT: process.env.PORT || 3000, // Get the port from environment variables or default to 3000
    MONGO_URI: process.env.MONGO_URI, // Get the MongoDB URI from environment variables
    JWT_SECRET: process.env.JWT_SECRET, // Get the JWT secret key from environment variables
    NODE_ENV: process.env.NODE_ENV, // Get the Node environment from environment variables or default to 'development'
    ARCJET_KEY: process.env.ARCJET_KEY, // Get the Arcjet key from environment variables
    ARCJET_ENV: process.env.ARCJET_ENV, // Get the Arcjet environment from environment variables or default to 'development'
};