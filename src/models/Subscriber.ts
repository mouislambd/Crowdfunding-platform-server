import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriber extends Document {
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
    },
    { timestamps: true }
);

export const Subscriber = mongoose.model<ISubscriber>("Subscriber", subscriberSchema);
