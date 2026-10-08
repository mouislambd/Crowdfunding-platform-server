import { Request, Response } from "express";
import { Withdrawal } from "../models/Withdrawal";

// Create withdrawal request (Creator)
export const createWithdrawal = async (req: Request, res: Response) => {
    try {
        const { withdrawal_credit, withdrawal_amount, payment_system, account_number } =
            req.body;

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

        res.status(200).json(withdrawal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};