import "dotenv/config";
import { Request, Response } from "express";
import { Withdrawal } from "../models/Withdrawal";
import { Campaign } from "../models/Campaign";
import { Payment } from "../models/Payment";
import { Notification } from "../models/Notification";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(uri);
const db = client.db();

// Withdrawal summary (Builder)
export const getWithdrawalSummary = async (req: Request, res: Response) => {
    try {
        const campaigns = await Campaign.find({ creator_email: req.user.email });
        const totalRaised = campaigns.reduce((sum, c) => sum + (c.amount_raised || 0), 0);
        const withdrawals = await Withdrawal.find({ creator_email: req.user.email, status: "approved" });
        const withdrawn = withdrawals.reduce((sum, w) => sum + (w.withdrawal_amount || 0), 0);
        const available = totalRaised - withdrawn;

        res.status(200).json({ totalRaised, withdrawn, available });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Create withdrawal request (Creator)
export const createWithdrawal = async (req: Request, res: Response) => {
    try {
        const { withdrawal_credit, payment_system, account_number } = req.body;
        
        // Validate
        const campaigns = await Campaign.find({ creator_email: req.user.email });
        const totalRaised = campaigns.reduce((sum, c) => sum + (c.amount_raised || 0), 0);
        const withdrawals = await Withdrawal.find({ creator_email: req.user.email, status: "approved" });
        const withdrawn = withdrawals.reduce((sum, w) => sum + (w.withdrawal_amount || 0), 0);
        const available = totalRaised - withdrawn;

        if (withdrawal_credit > available || withdrawal_credit < 200) {
            return res.status(400).json({ message: "Invalid credit amount" });
        }
        
        const withdrawal_amount = withdrawal_credit / 20;

        const withdrawal = await Withdrawal.create({
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ... (rest of the file)


// Get Creator's payment history (all their withdrawals)
export const getMyWithdrawals = async (req: Request, res: Response) => {
    try {
        const withdrawals = await Withdrawal.find({
            creator_email: req.user.email,
        }).sort({ createdAt: -1 });

        res.status(200).json(withdrawals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all pending withdrawal requests (Admin)
export const getPendingWithdrawals = async (req: Request, res: Response) => {
    try {
        const withdrawals = await Withdrawal.find({ status: "pending" }).sort({
            createdAt: -1,
        });

        res.status(200).json(withdrawals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Approve withdrawal / mark payment success (Admin)
export const approveWithdrawal = async (req: Request, res: Response) => {
    try {
        const withdrawal = await Withdrawal.findByIdAndUpdate(
            req.params.id,
            { status: "approved" },
            { new: true }
        );

        if (!withdrawal) {
            return res.status(404).json({ message: "Withdrawal not found" });
        }

        await Payment.create({
            user_email: withdrawal.creator_email,
            user_name: withdrawal.creator_name,
            amount: withdrawal.withdrawal_amount,
            credits: withdrawal.withdrawal_credit,
            payment_type: "withdrawal",
            status: "success",
        });

        await Notification.create({
            message: `Your withdrawal of ${withdrawal.withdrawal_amount} has been approved.`,
            toEmail: withdrawal.creator_email,
            actionRoute: "/dashboard/creator-home",
            time: new Date(),
        });

        res.status(200).json(withdrawal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};