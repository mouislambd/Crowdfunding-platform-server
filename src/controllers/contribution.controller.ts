import "dotenv/config";
import { Request, Response } from "express";
import { Contribution } from "../models/Contribution";
import { Campaign } from "../models/Campaign";
import { Notification } from "../models/Notification";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(uri);
const db = client.db();

// Create a new contribution (Supporter)
export const createContribution = async (req: Request, res: Response) => {
    try {
        const { campaign_id, contribution_amount, message } = req.body;

        const campaign = await Campaign.findById(campaign_id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        if (campaign.status !== "approved") {
            return res.status(400).json({ message: "Campaign not approved" });
        }

        if (new Date() > new Date(campaign.deadline)) {
            return res.status(400).json({ message: "Campaign deadline passed" });
        }

        if (contribution_amount < campaign.minimum_contribution) {
            return res.status(400).json({ message: "Contribution below minimum" });
        }

        const user = await db.collection("user").findOne({ email: req.user.email });
        if (!user || (user.credits || 0) < contribution_amount) {
            return res.status(400).json({ message: "Insufficient credits" });
        }

        await db.collection("user").updateOne({ email: req.user.email }, { $inc: { credits: -contribution_amount } });

        const contribution = await Contribution.create({
            campaign_id,
            campaign_title: campaign.campaign_title,
            contribution_amount,
            supporter_email: req.user.email,
            supporter_name: req.user.name,
            creator_email: campaign.creator_email,
            creator_name: campaign.creator_name,
            message,
            status: "pending",
        });

        // Notify the creator
        await Notification.create({
            message: `${req.user.name} contributed ${contribution_amount} credits to your campaign "${campaign.campaign_title}"`,
            toEmail: campaign.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });

        res.status(201).json(contribution);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get contributions for logged-in Supporter (My Contributions) with pagination
export const getMyContributions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const contributions = await Contribution.find({
            supporter_email: req.user.email,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Contribution.countDocuments({
            supporter_email: req.user.email,
        });

        res.status(200).json({
            contributions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get approved contributions for Supporter
export const getApprovedContributions = async (req: Request, res: Response) => {
    try {
        const contributions = await Contribution.find({
            supporter_email: req.user.email,
            status: "approved",
        }).sort({ createdAt: -1 });

        res.status(200).json(contributions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get pending contributions for Creator's campaigns
export const getPendingContributionsForCreator = async (
    req: Request,
    res: Response
) => {
    try {
        const contributions = await Contribution.find({
            creator_email: req.user.email,
            status: "pending",
        }).sort({ createdAt: -1 });

        res.status(200).json(contributions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Approve contribution (Creator)
export const approveContribution = async (req: Request, res: Response) => {
    try {
        const contribution = await Contribution.findOne({
            _id: req.params.id,
            creator_email: req.user.email,
        });

        if (!contribution) {
            return res.status(404).json({ message: "Contribution not found" });
        }

        contribution.status = "approved";
        await contribution.save();

        await Campaign.findByIdAndUpdate(contribution.campaign_id, {
            $inc: { amount_raised: contribution.contribution_amount },
        });

        await Notification.create({
            message: `Your contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was approved by ${req.user.name}`,
            toEmail: contribution.supporter_email,
            actionRoute: "/dashboard/supporter-home",
            time: new Date(),
        });

        res.status(200).json(contribution);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Reject contribution (Creator) - refund credits
export const rejectContribution = async (req: Request, res: Response) => {
    try {
        const contribution = await Contribution.findOne({
            _id: req.params.id,
            creator_email: req.user.email,
        });

        if (!contribution) {
            return res.status(404).json({ message: "Contribution not found" });
        }

        contribution.status = "rejected";
        await contribution.save();

        await db.collection("user").updateOne({ email: contribution.supporter_email }, { $inc: { credits: contribution.contribution_amount } });

        await Notification.create({
            message: `Your contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was rejected by ${req.user.name}`,
            toEmail: contribution.supporter_email,
            actionRoute: "/dashboard/supporter-home",
            time: new Date(),
        });

        res.status(200).json({
            message: "Contribution rejected, credits refunded",
            contribution,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};