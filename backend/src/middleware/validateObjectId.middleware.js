import mongoose from "mongoose";

/*
 * Rejects requests whose route param is not a valid MongoDB ObjectId.
 * Without this, Mongoose throws a CastError and the client gets a 500.
 */
export const validateObjectId = (param) => (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[param])) {
        return res.status(400).json({ message: `Invalid ${param}` });
    }
    next();
};
