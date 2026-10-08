import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    message: string;
    toEmail: string;
    actionRoute: string;
    time: Date;
    isRead: boolean;
}

const notificationSchema = new Schema<INotification>({
    message: { type: String, required: true },
    toEmail: { type: String, required: true },
    actionRoute: { type: String, required: true },
    time: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
});

export const Notification = mongoose.model<INotification>(
    "Notification",
    notificationSchema
);