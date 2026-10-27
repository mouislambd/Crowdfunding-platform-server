"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteCampaign = exports.getAllCampaigns = exports.rejectCampaign = exports.approveCampaign = exports.getPendingCampaigns = exports.deleteCampaign = exports.updateCampaign = exports.getMyCampaigns = exports.getCampaignById = exports.getTopFundedCampaigns = exports.getApprovedCampaigns = exports.createCampaign = void 0;
require("dotenv/config");
const Campaign_1 = require("../models/Campaign");
const Contribution_1 = require("../models/Contribution");
const Notification_1 = require("../models/Notification");
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new mongodb_1.MongoClient(uri);
const db = client.db();
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
        const campaigns = await Campaign_1.Campaign.find({
            status: "approved",
            deadline: { $gte: new Date() },
        }).sort({ createdAt: -1 });
        res.status(200).json(campaigns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getApprovedCampaigns = getApprovedCampaigns;
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
