import { Request, Response } from "express";
import { Subscriber } from "../models/Subscriber";

export const subscribe = async (req: Request, res: Response) => {
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

        await Subscriber.findOneAndUpdate(
            { email: trimmedEmail },
            { email: trimmedEmail },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({ message: "Thanks for subscribing!" });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};
