import "dotenv/config";
import { Request, Response } from "express";
import { Campaign } from "../models/Campaign";
import { CampaignUpdate } from "../models/CampaignUpdate";
import { Contribution } from "../models/Contribution";
import { Notification } from "../models/Notification";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(uri);
const db = client.db();

function escapeRegex(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

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
        const { category, search } = req.query;
        const filter: any = {
            status: "approved",
            deadline: { $gte: new Date() },
        };

        if (category && typeof category === "string") {
            filter.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, "i") };
        }

        if (search && typeof search === "string") {
            const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
            filter.$or = [
                { campaign_title: searchRegex },
                { campaign_story: searchRegex },
                { category: searchRegex },
            ];
        }

        const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });

        res.status(200).json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Advanced explore campaigns
export const exploreCampaigns = async (req: Request, res: Response) => {
    try {
        const {
            search,
            category,
            minGoal,
            maxGoal,
            status,
            sort = "newest",
            page = "1",
            limit = "9",
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(24, Math.max(1, parseInt(limit as string, 10) || 9));
        const skip = (pageNum - 1) * limitNum;

        const match: any = { status: "approved" };

        const now = new Date();
        if (status === "active") {
            match.deadline = { $gte: now };
            match.$expr = { $lt: ["$amount_raised", "$funding_goal"] };
        } else if (status === "ending-soon") {
            const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            match.deadline = { $gte: now, $lte: fourteenDays };
        } else if (status === "funded") {
            match.$expr = { $gte: ["$amount_raised", "$funding_goal"] };
        } else {
            match.deadline = { $gte: now };
        }

        if (category && typeof category === "string" && category.trim()) {
            match.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, "i") };
        }

        const minG = Number(minGoal);
        const maxG = Number(maxGoal);
        if (!isNaN(minG) || !isNaN(maxG)) {
            match.funding_goal = {};
            if (!isNaN(minG)) match.funding_goal.$gte = minG;
            if (!isNaN(maxG)) match.funding_goal.$lte = maxG;
        }

        if (search && typeof search === "string" && search.trim()) {
            const safeSearch = escapeRegex(search.trim());
            const searchRegex = new RegExp(safeSearch, "i");
            match.$or = [
                { campaign_title: searchRegex },
                { campaign_story: searchRegex },
                { category: searchRegex },
            ];
        }

        let sortObj: any = { createdAt: -1 };
        if (sort === "most-funded") {
            sortObj = { amount_raised: -1 };
        } else if (sort === "ending-soon") {
            sortObj = { deadline: 1 };
        } else if (sort === "goal-high") {
            sortObj = { funding_goal: -1 };
        }

        const aggregation = [
            { $match: match },
            {
                $addFields: {
                    percentFunded: {
                        $cond: [
                            { $eq: ["$funding_goal", 0] },
                            0,
                            { $multiply: [{ $divide: ["$amount_raised", "$funding_goal"] }, 100] },
                        ],
                    },
                },
            },
            { $sort: sortObj },
            {
                $facet: {
                    items: [{ $skip: skip }, { $limit: limitNum }],
                    total: [{ $count: "count" }],
                },
            },
        ];

        const result = await Campaign.aggregate(aggregation);
        const items = result[0]?.items || [];
        const total = result[0]?.total?.[0]?.count || 0;
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            items,
            total,
            page: pageNum,
            totalPages,
        });
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

// Campaign Updates controllers
export const getCampaignUpdates = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findById(id);
        if (!campaign || campaign.status !== "approved") {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const updates = await CampaignUpdate.find({ campaign_id: campaign._id }).sort({ createdAt: -1 });
        res.status(200).json(updates);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createCampaignUpdate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, body } = req.body;

        if (!title || typeof title !== "string" || title.length > 120) {
            return res.status(400).json({ message: "Title is required and must be at most 120 characters" });
        }
        if (!body || typeof body !== "string" || body.length > 2000) {
            return res.status(400).json({ message: "Body is required and must be at most 2000 characters" });
        }

        const campaign = await Campaign.findOne({ _id: id, creator_email: req.user.email });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found or unauthorized" });
        }

        const update = await CampaignUpdate.create({
            campaign_id: campaign._id,
            creator_email: req.user.email,
            creator_name: req.user.name,
            title: title.trim(),
            body: body.trim(),
        });

        const contributions = await Contribution.find({ campaign_id: campaign._id, status: "approved" });
        const distinctEmails = Array.from(new Set(contributions.map(c => c.supporter_email)));
        for (const email of distinctEmails) {
            await Notification.create({
                message: `New update on campaign "${campaign.campaign_title}": ${title.trim()}`,
                toEmail: email,
                actionRoute: `/campaigns/${campaign._id}`,
                time: new Date(),
            });
        }

        res.status(201).json(update);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCampaignUpdate = async (req: Request, res: Response) => {
    try {
        const { id, updateId } = req.params;
        const update = await CampaignUpdate.findOne({ _id: updateId, campaign_id: id });
        if (!update) {
            return res.status(404).json({ message: "Update not found" });
        }

        const campaign = await Campaign.findById(id);
        const isAdmin = req.user.role === "admin";
        const isOwner = campaign && campaign.creator_email === req.user.email;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await CampaignUpdate.findByIdAndDelete(updateId);
        res.status(200).json({ message: "Update deleted successfully" });
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
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            creator_email: req.user.email,
        });

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const approvedContributions = await Contribution.find({ campaign_id: campaign._id, status: "approved" });
        for (const cont of approvedContributions) {
            await db.collection("user").updateOne({ email: cont.supporter_email }, { $inc: { credits: cont.contribution_amount } });
        }

        await Campaign.findByIdAndDelete(campaign._id);
        res.status(200).json({ message: "Campaign deleted successfully and contributions refunded" });
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

        await Notification.create({
            message: `Your campaign "${campaign.campaign_title}" has been approved.`,
            toEmail: campaign.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });

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

        await Notification.create({
            message: `Your campaign "${campaign.campaign_title}" has been rejected.`,
            toEmail: campaign.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });

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
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const approvedContributions = await Contribution.find({ campaign_id: campaign._id, status: "approved" });
        for (const cont of approvedContributions) {
            await db.collection("user").updateOne({ email: cont.supporter_email }, { $inc: { credits: cont.contribution_amount } });
        }

        await Campaign.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Campaign deleted successfully and contributions refunded" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
