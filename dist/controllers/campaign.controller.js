"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteCampaign = exports.getAllCampaigns = exports.rejectCampaign = exports.approveCampaign = exports.getPendingCampaigns = exports.deleteCampaign = exports.updateCampaign = exports.getMyCampaigns = exports.deleteCampaignUpdate = exports.createCampaignUpdate = exports.getCampaignUpdates = exports.getCampaignById = exports.getTopFundedCampaigns = exports.exploreCampaigns = exports.getApprovedCampaigns = exports.createCampaign = void 0;
require("dotenv/config");
const Campaign_1 = require("../models/Campaign");
const CampaignUpdate_1 = require("../models/CampaignUpdate");
const Contribution_1 = require("../models/Contribution");
const Notification_1 = require("../models/Notification");
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new mongodb_1.MongoClient(uri);
const db = client.db();
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
// Create a new campaign (Creator)
const createCampaign = async (req, res) => {
    try {
        const campaignData = {
            ...req.body,
            creator_email: req.user.email,
            creator_name: req.user.name,
            status: "pending",
        };
        const campaign = await Campaign_1.Campaign.create(campaignData);
        res.status(201).json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCampaign = createCampaign;
// Get all approved campaigns (public - for Supporters, deadline not passed)
const getApprovedCampaigns = async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = {
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
        const campaigns = await Campaign_1.Campaign.find(filter).sort({ createdAt: -1 });
        res.status(200).json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getApprovedCampaigns = getApprovedCampaigns;
// Advanced explore campaigns
const exploreCampaigns = async (req, res) => {
    try {
        const { search, category, minGoal, maxGoal, status, sort = "newest", page = "1", limit = "9", } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(24, Math.max(1, parseInt(limit, 10) || 9));
        const skip = (pageNum - 1) * limitNum;
        const match = { status: "approved" };
        const now = new Date();
        if (status === "active") {
            match.deadline = { $gte: now };
            match.$expr = { $lt: ["$amount_raised", "$funding_goal"] };
        }
        else if (status === "ending-soon") {
            const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            match.deadline = { $gte: now, $lte: fourteenDays };
        }
        else if (status === "funded") {
            match.$expr = { $gte: ["$amount_raised", "$funding_goal"] };
        }
        else {
            match.deadline = { $gte: now };
        }
        if (category && typeof category === "string" && category.trim()) {
            match.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, "i") };
        }
        const minG = Number(minGoal);
        const maxG = Number(maxGoal);
        if (!isNaN(minG) || !isNaN(maxG)) {
            match.funding_goal = {};
            if (!isNaN(minG))
                match.funding_goal.$gte = minG;
            if (!isNaN(maxG))
                match.funding_goal.$lte = maxG;
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
        let sortObj = { createdAt: -1 };
        if (sort === "most-funded") {
            sortObj = { amount_raised: -1 };
        }
        else if (sort === "ending-soon") {
            sortObj = { deadline: 1 };
        }
        else if (sort === "goal-high") {
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
        const result = await Campaign_1.Campaign.aggregate(aggregation);
        const items = result[0]?.items || [];
        const total = result[0]?.total?.[0]?.count || 0;
        const totalPages = Math.ceil(total / limitNum);
        res.status(200).json({
            items,
            total,
            page: pageNum,
            totalPages,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.exploreCampaigns = exploreCampaigns;
// Get top 6 funded campaigns (homepage)
const getTopFundedCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign_1.Campaign.find({ status: "approved" })
            .sort({ amount_raised: -1 })
            .limit(6);
        res.status(200).json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTopFundedCampaigns = getTopFundedCampaigns;
// Get single campaign by id
const getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign_1.Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCampaignById = getCampaignById;
// Campaign Updates controllers
const getCampaignUpdates = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign_1.Campaign.findById(id);
        if (!campaign || campaign.status !== "approved") {
            return res.status(404).json({ message: "Campaign not found" });
        }
        const updates = await CampaignUpdate_1.CampaignUpdate.find({ campaign_id: campaign._id }).sort({ createdAt: -1 });
        res.status(200).json(updates);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCampaignUpdates = getCampaignUpdates;
const createCampaignUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, body } = req.body;
        if (!title || typeof title !== "string" || title.length > 120) {
            return res.status(400).json({ message: "Title is required and must be at most 120 characters" });
        }
        if (!body || typeof body !== "string" || body.length > 2000) {
            return res.status(400).json({ message: "Body is required and must be at most 2000 characters" });
        }
        const campaign = await Campaign_1.Campaign.findOne({ _id: id, creator_email: req.user.email });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found or unauthorized" });
        }
        const update = await CampaignUpdate_1.CampaignUpdate.create({
            campaign_id: campaign._id,
            creator_email: req.user.email,
            creator_name: req.user.name,
            title: title.trim(),
            body: body.trim(),
        });
        const contributions = await Contribution_1.Contribution.find({ campaign_id: campaign._id, status: "approved" });
        const distinctEmails = Array.from(new Set(contributions.map(c => c.supporter_email)));
        for (const email of distinctEmails) {
            await Notification_1.Notification.create({
                message: `New update on campaign "${campaign.campaign_title}": ${title.trim()}`,
                toEmail: email,
                actionRoute: `/campaigns/${campaign._id}`,
                time: new Date(),
            });
        }
        res.status(201).json(update);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCampaignUpdate = createCampaignUpdate;
const deleteCampaignUpdate = async (req, res) => {
    try {
        const { id, updateId } = req.params;
        const update = await CampaignUpdate_1.CampaignUpdate.findOne({ _id: updateId, campaign_id: id });
        if (!update) {
            return res.status(404).json({ message: "Update not found" });
        }
        const campaign = await Campaign_1.Campaign.findById(id);
        const isAdmin = req.user.role === "admin";
        const isOwner = campaign && campaign.creator_email === req.user.email;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Forbidden" });
        }
        await CampaignUpdate_1.CampaignUpdate.findByIdAndDelete(updateId);
        res.status(200).json({ message: "Update deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteCampaignUpdate = deleteCampaignUpdate;
// Get campaigns created by logged-in Creator (My Campaigns)
const getMyCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign_1.Campaign.find({
            creator_email: req.user.email,
        }).sort({ deadline: -1 });
        res.status(200).json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyCampaigns = getMyCampaigns;
// Update campaign (Creator - only title, story, reward_info)
const updateCampaign = async (req, res) => {
    try {
        const { campaign_title, campaign_story, reward_info } = req.body;
        const campaign = await Campaign_1.Campaign.findOneAndUpdate({ _id: req.params.id, creator_email: req.user.email }, { campaign_title, campaign_story, reward_info }, { new: true });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.status(200).json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateCampaign = updateCampaign;
// Delete campaign (Creator)
const deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign_1.Campaign.findOne({
            _id: req.params.id,
            creator_email: req.user.email,
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        const approvedContributions = await Contribution_1.Contribution.find({ campaign_id: campaign._id, status: "approved" });
        for (const cont of approvedContributions) {
            await db.collection("user").updateOne({ email: cont.supporter_email }, { $inc: { credits: cont.contribution_amount } });
        }
        await Campaign_1.Campaign.findByIdAndDelete(campaign._id);
        res.status(200).json({ message: "Campaign deleted successfully and contributions refunded" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteCampaign = deleteCampaign;
// Get all pending campaigns (Admin)
const getPendingCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign_1.Campaign.find({ status: "pending" }).sort({
            createdAt: -1,
        });
        res.status(200).json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPendingCampaigns = getPendingCampaigns;
// Approve campaign (Admin)
const approveCampaign = async (req, res) => {
    try {
        const campaign = await Campaign_1.Campaign.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        await Notification_1.Notification.create({
            message: `Your campaign "${campaign.campaign_title}" has been approved.`,
            toEmail: campaign.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });
        res.status(200).json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.approveCampaign = approveCampaign;
// Reject campaign (Admin)
const rejectCampaign = async (req, res) => {
    try {
        const campaign = await Campaign_1.Campaign.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        await Notification_1.Notification.create({
            message: `Your campaign "${campaign.campaign_title}" has been rejected.`,
            toEmail: campaign.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });
        res.status(200).json(campaign);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.rejectCampaign = rejectCampaign;
// Get all campaigns (Admin - Manage Campaigns)
const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign_1.Campaign.find().sort({ createdAt: -1 });
        res.status(200).json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllCampaigns = getAllCampaigns;
// Delete campaign by Admin
const adminDeleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign_1.Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        const approvedContributions = await Contribution_1.Contribution.find({ campaign_id: campaign._id, status: "approved" });
        for (const cont of approvedContributions) {
            await db.collection("user").updateOne({ email: cont.supporter_email }, { $inc: { credits: cont.contribution_amount } });
        }
        await Campaign_1.Campaign.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Campaign deleted successfully and contributions refunded" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminDeleteCampaign = adminDeleteCampaign;
