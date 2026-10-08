import mongoose, { Schema, Document } from "mongoose";

export interface IContribution extends Document {
    campaign_id: mongoose.Types.ObjectId;
    campaign_title: string;
    contribution_amount: number;
    supporter_email: string;
    supporter_name: string;
    creator_email: string;
    creator_name: string;
    status: "pending" | "approved" | "rejected";
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

const contributionSchema = new Schema<IContribution>(
    {
        campaign_id: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
        campaign_title: { type: String, required: true },
        contribution_amount: { type: Number, required: true },
        supporter_email: { type: String, required: true },
        supporter_name: { type: String, required: true },
        creator_email: { type: String, required: true },
        creator_name: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        message: { type: String },
    },
    { timestamps: true }
);

export const Contribution = mongoose.model<IContribution>(
    "Contribution",
    contributionSchema
);