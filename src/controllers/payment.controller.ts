import { Request, Response } from "express";
import { MongoClient } from "mongodb";
import { Payment } from "../models/Payment";

const client = new MongoClient(process.env.MONGODB_URI as string);

export const createPayment = async (req: Request, res: Response) => {
    try {
        const { amount, credits, payment_type, transaction_id } = req.body;
        const { email, name } = req.user;

        // 1. Create Payment document
        const payment = await Payment.create({
            user_email: email,
            user_name: name,
            amount,
            credits,
            payment_type: payment_type || "credit_purchase",
            status: "success",
            transaction_id,
        });

        // 2. Update user's credits
        const db = client.db();
        await db.collection("user").updateOne(
            { email: email },
            { $inc: { credits: credits } }
        );

        res.status(201).json(payment);
    } catch (error: any) {
        console.error("Payment error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getMyPayments = async (req: Request, res: Response) => {
    try {
        const payments = await Payment.find({
            user_email: req.user.email,
        }).sort({ createdAt: -1 });

        res.status(200).json(payments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
