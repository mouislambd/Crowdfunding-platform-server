"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyNotifications = void 0;
const Notification_1 = require("../models/Notification");
// Get notifications for logged-in user
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.Notification.find({
            toEmail: req.user.email,
        }).sort({ time: -1 });
        res.status(200).json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyNotifications = getMyNotifications;
