"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPayments = exports.createPayment = void 0;
require("dotenv/config");
const mongodb_1 = require("mongodb");
const Payment_1 = require("../models/Payment");
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new mongodb_1.MongoClient(uri);
const createPayment = async (req, res) => {
    try {
        const { amount, credits, payment_type, transaction_id } = req.body;
        const { email, name } = req.user;
        // 1. Create Payment document
        const payment = await Payment_1.Payment.create({
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
        await db.collection("user").updateOne({ email: email }, { $inc: { credits: credits } });
        res.status(201).json(payment);
    }
    catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({ message: error.message });
    }
};
exports.createPayment = createPayment;
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment_1.Payment.find({
            user_email: req.user.email,
        }).sort({ createdAt: -1 });
        res.status(200).json(payments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyPayments = getMyPayments;
