import { Request, Response } from "express";
import { Report } from "../models/Report";
import { Campaign } from "../models/Campaign";

// Create report (Supporter)
export const createReport = async (req: Request, res: Response) => {
    try {
        const { campaign_id, reason } = req.body;
        const campaign = await Campaign.findById(campaign_id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        const report = await Report.create({
            campaign_id,
            campaign_title: campaign.campaign_title,
            reporter_email: req.user.email,
            reporter_name: req.user.name,
            reason,
        });
        res.status(201).json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all reports (Admin)
export const getReports = async (req: Request, res: Response) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.status(200).json(reports);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Suspend campaign (Admin)
export const suspendCampaign = async (req: Request, res: Response) => {
    try {
        await Campaign.findByIdAndUpdate(req.params.campaignId, { status: "suspended" });
        await Report.updateMany({ campaign_id: req.params.campaignId }, { status: "reviewed" });
        res.status(200).json({ message: "Campaign suspended" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Delete campaign (Admin)
export const deleteCampaign = async (req: Request, res: Response) => {
    try {
        await Campaign.findByIdAndDelete(req.params.campaignId);
        await Report.deleteMany({ campaign_id: req.params.campaignId });
        res.status(200).json({ message: "Campaign deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
