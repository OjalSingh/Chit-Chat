import 'dotenv/config'; // Load environment variables from .env file

export const ENV = {   
    PORT: process.env.PORT || 3000, // Get the port from environment variables or default to 3000
    MONGO_URI: process.env.MONGO_URI, // Get the MongoDB URI from environment variables
    JWT_SECRET: process.env.JWT_SECRET, // Get the JWT secret key from environment variables
    NODE_ENV: process.env.NODE_ENV, // Get the Node environment from environment variables or default to 'development'
    ARCJET_KEY: process.env.ARCJET_KEY, // Get the Arcjet key from environment variables
    ARCJET_ENV: process.env.ARCJET_ENV, // Get the Arcjet environment from environment variables or default to 'development'
    CLIENT_URL: process.env.CLIENT_URL,

    // AI Plan cards. Detection runs only when PLAN_DETECTION is not "off"
    // and the Anthropic SDK can find credentials (e.g. ANTHROPIC_API_KEY).
    PLAN_DETECTION: process.env.PLAN_DETECTION ?? "on",
    PLAN_MODEL: process.env.PLAN_MODEL || "claude-opus-5-5",
    PLAN_TIMEZONE: process.env.PLAN_TIMEZONE || "Asia/Kolkata",
    // How long a group must be quiet before the detector reads it.
    PLAN_DEBOUNCE_MS: Number(process.env.PLAN_DEBOUNCE_MS ?? 10_000),
    // How many recent messages the detector reads.
    PLAN_CONTEXT_MESSAGES: Number(process.env.PLAN_CONTEXT_MESSAGES ?? 20),
    // Day boundary for the daily games (everyone's "today" flips at the same moment).
    GAME_TIMEZONE: process.env.GAME_TIMEZONE || process.env.PLAN_TIMEZONE || "Asia/Kolkata",
    // Reminders in the group chat 1 hour and 5 minutes before a plan starts.
    PLAN_REMINDERS: process.env.PLAN_REMINDERS ?? "on",
    PLAN_MIN_CONFIDENCE: Number(process.env.PLAN_MIN_CONFIDENCE ?? 0.7),
};