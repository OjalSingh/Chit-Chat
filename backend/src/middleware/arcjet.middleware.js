import aj from '../lib/arcjet.js';
import { isSpoofedBot } from "@arcjet/inspect";


export const arcjetProtection = async (req, res, next) => {
  try {
    const decision = await aj.protect(req);  // Inspect the request using Arcjet

    if (decision.isDenied()){
        if(decision.reason.isRateLimit()){
            return res.status(429).json({message: "Rate limit exceeded. Please try again later."});
        }
     else if(decision.reason.isBot()){
        return res.status(403).json({ message: "Bot access denied."});
    } else {
            return res.status(403).json({ message: "Access denied due to security reasons. "});
        }

    }

    //check for spoofed bots
    if (decision.results.some(isSpoofedBot)) {
        return res.satus(403).json({
            error: "Spoorfed bot detected",
            message: "Malicious bot activity detected.",
        });
    }

    next();

    } catch (error){
    console.log("Arcjet Protection Error:", error);
    next();
  }
};