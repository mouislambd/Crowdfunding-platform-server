import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    user_email: string;
    user_name: string;
    amount: number;
    credits: number;
    payment_type: "credit_purchase" | "withdrawal";
    transaction_id: string;
    status: "success" | "pending" | "failed";
    stripe_session_id?: string;
    stripe_payment_intent_id?: string;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        user_email: { type: String, required: true },
        user_name: { type: String, required: true },
        amount: { type: Number, required: true },
        credits: { type: Number, required: true },
        payment_type: {
            type: String,
            enum: ["credit_purchase", "withdrawal"],
            required: true,
        },
        transaction_id: { type: String, required: true },
        status: {
            type: String,
            enum: ["success", "pending", "failed"],
            default: "pending",
        },
        stripe_session_id: { type: String },
        stripe_payment_intent_id: { type: String },
    },
    { timestamps: true }
);

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);