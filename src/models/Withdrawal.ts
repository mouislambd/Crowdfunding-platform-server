import mongoose, { Schema, Document } from "mongoose";

export interface IWithdrawal extends Document {
    creator_email: string;
    creator_name: string;
    withdrawal_credit: number;
    withdrawal_amount: number;
    payment_system: string;
    account_number: string;
    withdraw_date: Date;
    status: "pending" | "approved";
    createdAt: Date;
    updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
    {
        creator_email: { type: String, required: true },
        creator_name: { type: String, required: true },
        withdrawal_credit: { type: Number, required: true },
        withdrawal_amount: { type: Number, required: true },
        payment_system: { type: String, required: true },
        account_number: { type: String, required: true },
        withdraw_date: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ["pending", "approved"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const Withdrawal = mongoose.model<IWithdrawal>(
    "Withdrawal",
    withdrawalSchema
);