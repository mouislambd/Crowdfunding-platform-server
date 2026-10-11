"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveWithdrawal = exports.getPendingWithdrawals = exports.getMyWithdrawals = exports.createWithdrawal = void 0;
const Withdrawal_1 = require("../models/Withdrawal");
// Create withdrawal request (Creator)
const createWithdrawal = async (req, res) => {
    try {
        const { withdrawal_credit, withdrawal_amount, payment_system, account_number } = req.body;
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
        res.status(200).json(withdrawal);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.approveWithdrawal = approveWithdrawal;
