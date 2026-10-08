import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
    campaign_title: string;
    campaign_story: string;
    category: string;
    funding_goal: number;
    minimum_contribution: number;
    deadline: Date;
    reward_info: string;
    campaign_image_url: string;
    amount_raised: number;
    status: "pending" | "approved" | "rejected" | "suspended";
    creator_email: string;
    creator_name: string;
    createdAt: Date;
    updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
    {
        campaign_title: { type: String, required: true },
        campaign_story: { type: String, required: true },
        category: { type: String, required: true },
        funding_goal: { type: Number, required: true },
        minimum_contribution: { type: Number, required: true },
        deadline: { type: Date, required: true },
        reward_info: { type: String, required: true },
        campaign_image_url: { type: String, required: true },
        amount_raised: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "suspended"],
            default: "pending",
        },
        creator_email: { type: String, required: true },
        creator_name: { type: String, required: true },
    },
    { timestamps: true }
);

export const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);