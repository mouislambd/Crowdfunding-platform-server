import mongoose, { Schema, Document } from "mongoose";

export interface ICampaignUpdate extends Document {
    campaign_id: mongoose.Types.ObjectId;
    creator_email: string;
    creator_name: string;
    title: string;
    body: string;
    createdAt: Date;
}

const campaignUpdateSchema = new Schema<ICampaignUpdate>(
    {
        campaign_id: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
        creator_email: { type: String, required: true },
        creator_name: { type: String, required: true },
        title: { type: String, required: true, maxlength: 120 },
        body: { type: String, required: true, maxlength: 2000 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const CampaignUpdate = mongoose.model<ICampaignUpdate>(
    "CampaignUpdate",
    campaignUpdateSchema
);
