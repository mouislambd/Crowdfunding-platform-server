"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCampaign = exports.suspendCampaign = exports.getReports = exports.createReport = void 0;
const Report_1 = require("../models/Report");
const Campaign_1 = require("../models/Campaign");
// Create report (Supporter)
const createReport = async (req, res) => {
    try {
        const { campaign_id, reason } = req.body;
        const campaign = await Campaign_1.Campaign.findById(campaign_id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        const report = await Report_1.Report.create({
            campaign_id,
            campaign_title: campaign.campaign_title,
            reporter_email: req.user.email,
            reporter_name: req.user.name,
            reason,
        });
        res.status(201).json(report);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createReport = createReport;
// Get all reports (Admin)
const getReports = async (req, res) => {
    try {
        const reports = await Report_1.Report.find().sort({ createdAt: -1 });
        res.status(200).json(reports);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getReports = getReports;
// Suspend campaign (Admin)
const suspendCampaign = async (req, res) => {
    try {
        await Campaign_1.Campaign.findByIdAndUpdate(req.params.campaignId, { status: "suspended" });
        await Report_1.Report.updateMany({ campaign_id: req.params.campaignId }, { status: "reviewed" });
        res.status(200).json({ message: "Campaign suspended" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.suspendCampaign = suspendCampaign;
// Delete campaign (Admin)
const deleteCampaign = async (req, res) => {
    try {
        await Campaign_1.Campaign.findByIdAndDelete(req.params.campaignId);
        await Report_1.Report.deleteMany({ campaign_id: req.params.campaignId });
        res.status(200).json({ message: "Campaign deleted" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteCampaign = deleteCampaign;
