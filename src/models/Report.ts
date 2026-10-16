import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
    campaign_id: mongoose.Types.ObjectId;
    campaign_title: string;
    reporter_email: string;
    reporter_name: string;
    reason: string;
    status: "pending" | "reviewed";
    createdAt: Date;
}

const reportSchema = new Schema<IReport>(
    {
        campaign_id: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
        campaign_title: { type: String, required: true },
        reporter_email: { type: String, required: true },
        reporter_name: { type: String, required: true },
        reason: { type: String, required: true },
        status: { type: String, enum: ["pending", "reviewed"], default: "pending" },
    },
    { timestamps: true }
);

export const Report = mongoose.model<IReport>("Report", reportSchema);
