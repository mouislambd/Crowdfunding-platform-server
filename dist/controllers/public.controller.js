"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = void 0;
const Subscriber_1 = require("../models/Subscriber");
const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== "string" || email.length > 254) {
            return res.status(400).json({ message: "Invalid email address." });
        }
        const trimmedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ message: "Invalid email address format." });
        }
        await Subscriber_1.Subscriber.findOneAndUpdate({ email: trimmedEmail }, { email: trimmedEmail }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return res.status(200).json({ message: "Thanks for subscribing!" });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};
exports.subscribe = subscribe;
