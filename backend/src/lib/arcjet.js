import { ENV } from './env.js';
import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com and set it as an environment
  // variable rather than hard coding.
  key: ENV.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    
    slidingWindow({
      mode: "LIVE",
      max: 20, // Max 20 requests per interval
      // Tracked by IP address by default, but this can be customized
      //characteristics: ["ip.src"],
      interval: 60, // Refill every 60 seconds
    }),
  ],
});

export default aj; 