"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveWithdrawal = exports.getPendingWithdrawals = exports.getMyWithdrawals = exports.createWithdrawal = exports.getWithdrawalSummary = void 0;
const Withdrawal_1 = require("../models/Withdrawal");
const Campaign_1 = require("../models/Campaign");
const Payment_1 = require("../models/Payment");
const Notification_1 = require("../models/Notification");
const mongodb_1 = require("mongodb");
const client = new mongodb_1.MongoClient(process.env.MONGODB_URI);
const db = client.db();
// Withdrawal summary (Builder)
const getWithdrawalSummary = async (req, res) => {
    try {
        const campaigns = await Campaign_1.Campaign.find({ creator_email: req.user.email });
        const totalRaised = campaigns.reduce((sum, c) => sum + (c.amount_raised || 0), 0);
        const withdrawals = await Withdrawal_1.Withdrawal.find({ creator_email: req.user.email, status: "approved" });
        const withdrawn = withdrawals.reduce((sum, w) => sum + (w.withdrawal_amount || 0), 0);
        const available = totalRaised - withdrawn;
        res.status(200).json({ totalRaised, withdrawn, available });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getWithdrawalSummary = getWithdrawalSummary;
// Create withdrawal request (Creator)
const createWithdrawal = async (req, res) => {
    try {
        const { withdrawal_credit, payment_system, account_number } = req.body;
        // Validate
        const campaigns = await Campaign_1.Campaign.find({ creator_email: req.user.email });
        const totalRaised = campaigns.reduce((sum, c) => sum + (c.amount_raised || 0), 0);
        const withdrawals = await Withdrawal_1.Withdrawal.find({ creator_email: req.user.email, status: "approved" });
        const withdrawn = withdrawals.reduce((sum, w) => sum + (w.withdrawal_amount || 0), 0);
        const available = totalRaised - withdrawn;
        if (withdrawal_credit > available || withdrawal_credit < 200) {
            return res.status(400).json({ message: "Invalid credit amount" });
        }
        const withdrawal_amount = withdrawal_credit / 20;
        const withdrawal = await Withdrawal_1.Withdrawal.create({
            creator_email: req.user.email,
            creator_name: req.user.name,
            withdrawal_credit,
            withdrawal_amount,
            payment_system,
            account_number,
            withdraw_date: new Date(),
            status: "pending",
        });
        res.status(201).json(withdrawal);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createWithdrawal = createWithdrawal;
// ... (rest of the file)
// Get Creator's payment history (all their withdrawals)
const getMyWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal_1.Withdrawal.find({
            creator_email: req.user.email,
        }).sort({ createdAt: -1 });
        res.status(200).json(withdrawals);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyWithdrawals = getMyWithdrawals;
// Get all pending withdrawal requests (Admin)
const getPendingWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal_1.Withdrawal.find({ status: "pending" }).sort({
            createdAt: -1,
        });
        res.status(200).json(withdrawals);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPendingWithdrawals = getPendingWithdrawals;
// Approve withdrawal / mark payment success (Admin)
const approveWithdrawal = async (req, res) => {
    try {
        const withdrawal = await Withdrawal_1.Withdrawal.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
        if (!withdrawal) {
            return res.status(404).json({ message: "Withdrawal not found" });
        }
        await Payment_1.Payment.create({
            user_email: withdrawal.creator_email,
            user_name: withdrawal.creator_name,
            amount: withdrawal.withdrawal_amount,
            credits: withdrawal.withdrawal_credit,
            payment_type: "withdrawal",
            status: "success",
        });
        await Notification_1.Notification.create({
            message: `Your withdrawal of ${withdrawal.withdrawal_amount} has been approved.`,
            toEmail: withdrawal.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });
        res.status(200).json(withdrawal);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.approveWithdrawal = approveWithdrawal;
