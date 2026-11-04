"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPayments = exports.handleStripeWebhook = exports.createCheckoutSession = void 0;
require("dotenv/config");
const mongodb_1 = require("mongodb");
const Payment_1 = require("../models/Payment");
const stripe_1 = __importDefault(require("stripe"));
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new mongodb_1.MongoClient(uri);
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
}
const stripe = new stripe_1.default(stripeKey, {
    apiVersion: "2025-01-27.acacia",
});
const createCheckoutSession = async (req, res) => {
    try {
        const { amount, credits, payment_type } = req.body;
        const { email, name } = req.user;
        if (!amount || !credits) {
            return res.status(400).json({ message: "Amount and credits are required" });
        }
        const clientUrl = process.env.CLIENT_URL;
        if (!clientUrl) {
            throw new Error("CLIENT_URL is not set");
        }
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${credits} Credits (funrised)`,
                        },
                        unit_amount: Math.round(Number(amount) * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/payment-cancel`,
            metadata: {
                user_email: email,
                user_name: name,
                credits: credits.toString(),
                payment_type: payment_type || "credit_purchase",
            },
        });
        // Create pending payment record
        await Payment_1.Payment.create({
            user_email: email,
            user_name: name,
            amount: Number(amount),
            credits: Number(credits),
            payment_type: payment_type || "credit_purchase",
            status: "pending",
            transaction_id: session.id,
            stripe_session_id: session.id,
        });
        res.status(200).json({ url: session.url, sessionId: session.id });
    }
    catch (error) {
        console.error("Stripe Checkout Session error:", error);
        res.status(500).json({ message: error.message });
    }
};
exports.createCheckoutSession = createCheckoutSession;
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        if (!webhookSecret || webhookSecret === "whsec_test") {
            event = req.body;
        }
        else {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
    }
    catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const metadata = session.metadata;
        if (metadata && metadata.user_email && metadata.credits) {
            const userEmail = metadata.user_email;
            const credits = Number(metadata.credits);
            const sessionId = session.id;
            const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
            // 1. Update Payment status
            const payment = await Payment_1.Payment.findOneAndUpdate({ stripe_session_id: sessionId }, {
                status: "success",
                stripe_payment_intent_id: paymentIntentId,
                transaction_id: paymentIntentId || sessionId,
            }, { new: true });
            // 2. Increment user credits in MongoDB
            if (payment && payment.status === "success") {
                const dbInstance = client.db();
                await dbInstance.collection("user").updateOne({ email: userEmail }, { $inc: { credits: credits } });
            }
        }
    }
    res.status(200).json({ received: true });
};
exports.handleStripeWebhook = handleStripeWebhook;
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
