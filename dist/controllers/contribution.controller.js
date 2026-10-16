"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectContribution = exports.approveContribution = exports.getPendingContributionsForCreator = exports.getApprovedContributions = exports.getMyContributions = exports.createContribution = void 0;
const Contribution_1 = require("../models/Contribution");
const Campaign_1 = require("../models/Campaign");
const Notification_1 = require("../models/Notification");
const mongodb_1 = require("mongodb");
const client = new mongodb_1.MongoClient(process.env.MONGODB_URI);
const db = client.db();
// Create a new contribution (Supporter)
const createContribution = async (req, res) => {
    try {
        const { campaign_id, contribution_amount, message } = req.body;
        const campaign = await Campaign_1.Campaign.findById(campaign_id);
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
        const contribution = await Contribution_1.Contribution.create({
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
        await Notification_1.Notification.create({
            message: `${req.user.name} contributed ${contribution_amount} credits to your campaign "${campaign.campaign_title}"`,
            toEmail: campaign.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });
        res.status(201).json(contribution);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createContribution = createContribution;
// Get contributions for logged-in Supporter (My Contributions) with pagination
const getMyContributions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const contributions = await Contribution_1.Contribution.find({
            supporter_email: req.user.email,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Contribution_1.Contribution.countDocuments({
            supporter_email: req.user.email,
        });
        res.status(200).json({
            contributions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyContributions = getMyContributions;
// Get approved contributions for Supporter
const getApprovedContributions = async (req, res) => {
    try {
        const contributions = await Contribution_1.Contribution.find({
            supporter_email: req.user.email,
            status: "approved",
        }).sort({ createdAt: -1 });
        res.status(200).json(contributions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getApprovedContributions = getApprovedContributions;
// Get pending contributions for Creator's campaigns
const getPendingContributionsForCreator = async (req, res) => {
    try {
        const contributions = await Contribution_1.Contribution.find({
            creator_email: req.user.email,
            status: "pending",
        }).sort({ createdAt: -1 });
        res.status(200).json(contributions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPendingContributionsForCreator = getPendingContributionsForCreator;
// Approve contribution (Creator)
const approveContribution = async (req, res) => {
    try {
        const contribution = await Contribution_1.Contribution.findOne({
            _id: req.params.id,
            creator_email: req.user.email,
        });
        if (!contribution) {
            return res.status(404).json({ message: "Contribution not found" });
        }
        contribution.status = "approved";
        await contribution.save();
        await Campaign_1.Campaign.findByIdAndUpdate(contribution.campaign_id, {
            $inc: { amount_raised: contribution.contribution_amount },
        });
        await Notification_1.Notification.create({
            message: `Your contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was approved by ${req.user.name}`,
            toEmail: contribution.supporter_email,
            actionRoute: "/dashboard/supporter-home",
            time: new Date(),
        });
        res.status(200).json(contribution);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.approveContribution = approveContribution;
// Reject contribution (Creator) - refund credits
const rejectContribution = async (req, res) => {
    try {
        const contribution = await Contribution_1.Contribution.findOne({
            _id: req.params.id,
            creator_email: req.user.email,
        });
        if (!contribution) {
            return res.status(404).json({ message: "Contribution not found" });
        }
        contribution.status = "rejected";
        await contribution.save();
        await db.collection("user").updateOne({ email: contribution.supporter_email }, { $inc: { credits: contribution.contribution_amount } });
        await Notification_1.Notification.create({
            message: `Your contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was rejected by ${req.user.name}`,
            toEmail: contribution.supporter_email,
            actionRoute: "/dashboard/supporter-home",
            time: new Date(),
        });
        res.status(200).json({
            message: "Contribution rejected, credits refunded",
            contribution,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.rejectContribution = rejectContribution;
