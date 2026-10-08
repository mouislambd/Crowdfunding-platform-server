import { Request, Response } from "express";
import { Campaign } from "../models/Campaign";

// Create a new campaign (Creator)
export const createCampaign = async (req: Request, res: Response) => {
    try {
        const campaignData = {
            ...req.body,
            creator_email: req.user.email,
            creator_name: req.user.name,
            status: "pending",
        };

        const campaign = await Campaign.create(campaignData);
        res.status(201).json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all approved campaigns (public - for Supporters, deadline not passed)
export const getApprovedCampaigns = async (req: Request, res: Response) => {
    try {
        const campaigns = await Campaign.find({
            status: "approved",
            deadline: { $gte: new Date() },
        }).sort({ createdAt: -1 });

        res.status(200).json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get top 6 funded campaigns (homepage)
export const getTopFundedCampaigns = async (req: Request, res: Response) => {
    try {
        const campaigns = await Campaign.find({ status: "approved" })
            .sort({ amount_raised: -1 })
            .limit(6);

        res.status(200).json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get single campaign by id
export const getCampaignById = async (req: Request, res: Response) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get campaigns created by logged-in Creator (My Campaigns)
export const getMyCampaigns = async (req: Request, res: Response) => {
    try {
        const campaigns = await Campaign.find({
            creator_email: req.user.email,
        }).sort({ deadline: -1 });

        res.status(200).json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Update campaign (Creator - only title, story, reward_info)
export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const { campaign_title, campaign_story, reward_info } = req.body;

        const campaign = await Campaign.findOneAndUpdate(
            { _id: req.params.id, creator_email: req.user.email },
            { campaign_title, campaign_story, reward_info },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        res.status(200).json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Delete campaign (Creator)
export const deleteCampaign = async (req: Request, res: Response) => {
    try {
        const campaign = await Campaign.findOneAndDelete({
            _id: req.params.id,
            creator_email: req.user.email,
        });

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        res.status(200).json({ message: "Campaign deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all pending campaigns (Admin)
export const getPendingCampaigns = async (req: Request, res: Response) => {
    try {
        const campaigns = await Campaign.find({ status: "pending" }).sort({
            createdAt: -1,
        });
        res.status(200).json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Approve campaign (Admin)
export const approveCampaign = async (req: Request, res: Response) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            { status: "approved" },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        res.status(200).json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Reject campaign (Admin)
export const rejectCampaign = async (req: Request, res: Response) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            { status: "rejected" },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        res.status(200).json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all campaigns (Admin - Manage Campaigns)
export const getAllCampaigns = async (req: Request, res: Response) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 });
        res.status(200).json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Delete campaign by Admin
export const adminDeleteCampaign = async (req: Request, res: Response) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json({ message: "Campaign deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};