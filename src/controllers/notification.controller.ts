import { Request, Response } from "express";
import { Notification } from "../models/Notification";

// Get notifications for logged-in user
export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find({
            toEmail: req.user.email,
        }).sort({ time: -1 });

        res.status(200).json(notifications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};