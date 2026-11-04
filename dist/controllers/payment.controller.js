"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPayments = exports.getSessionStatus = exports.handleStripeWebhook = exports.createCheckoutSession = exports.requireStripeConfig = void 0;
exports.fulfillCheckoutSession = fulfillCheckoutSession;
require("dotenv/config");
const mongodb_1 = require("mongodb");
const Payment_1 = require("../models/Payment");
const Notification_1 = require("../models/Notification");
const stripe_1 = __importDefault(require("stripe"));
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new mongodb_1.MongoClient(uri);
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeKey ? new stripe_1.default(stripeKey, { apiVersion: "2025-01-27.acacia" }) : null;
const CREDIT_PACKAGES = {
    p100: { credits: 100, amount: 10, name: "100 Credits" },
    p300: { credits: 300, amount: 25, name: "300 Credits" },
    p800: { credits: 800, amount: 60, name: "800 Credits" },
    p1500: { credits: 1500, amount: 110, name: "1500 Credits" },
};
const requireStripeConfig = (req, res, next) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ message: "Payments are not configured" });
    }
    next();
};
exports.requireStripeConfig = requireStripeConfig;
async function fulfillCheckoutSession(session) {
    if (session.payment_status !== "paid")
        return;
    const sessionId = session.id;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    const metadata = session.metadata || {};
    const userEmail = metadata.email;
    const packageId = metadata.packageId;
    if (!userEmail || !packageId || !CREDIT_PACKAGES[packageId])
        return;
    const pkg = CREDIT_PACKAGES[packageId];
    const payment = await Payment_1.Payment.findOneAndUpdate({ stripe_session_id: sessionId, status: "pending" }, {
        status: "success",
        stripe_payment_intent_id: paymentIntentId,
        transaction_id: paymentIntentId || sessionId,
    }, { new: true });
    if (payment) {
        const dbInstance = client.db();
        await dbInstance.collection("user").updateOne({ email: userEmail }, { $inc: { credits: pkg.credits } });
        await Notification_1.Notification.create({
            message: `Successfully purchased ${pkg.credits} credits!`,
            toEmail: userEmail,
            actionRoute: "/dashboard/supporter-home",
            time: new Date(),
        });
    }
}
const createCheckoutSession = async (req, res) => {
    try {
        const { packageId } = req.body;
        const { email, name } = req.user;
        if (!packageId || !CREDIT_PACKAGES[packageId]) {
            return res.status(400).json({ message: "Invalid or missing packageId" });
        }
        const pkg = CREDIT_PACKAGES[packageId];
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
                            name: `${pkg.name} (FundRise)`,
                        },
                        unit_amount: pkg.amount * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${clientUrl}/dashboard/purchase-credit/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/dashboard/purchase-credit?canceled=1`,
            metadata: {
                email,
                packageId,
            },
        });
        await Payment_1.Payment.create({
            user_email: email,
            user_name: name || email,
            amount: pkg.amount,
            credits: pkg.credits,
            payment_type: "credit_purchase",
            status: "pending",
            transaction_id: session.id,
            stripe_session_id: session.id,
        });
        res.status(200).json({ url: session.url, sessionId: session.id });
    }
    catch (error) {
        console.error("Stripe Checkout Session error:", error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.createCheckoutSession = createCheckoutSession;
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(400).send("Webhook Error: STRIPE_WEBHOOK_SECRET is not set");
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data.object;
        await fulfillCheckoutSession(session);
    }
    res.status(200).json({ received: true });
};
exports.handleStripeWebhook = handleStripeWebhook;
const getSessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            return res.status(400).json({ message: "Session ID required" });
        }
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const metadata = session.metadata || {};
        if (metadata.email !== req.user.email) {
            return res.status(403).json({ message: "Unauthorized session access" });
        }
        if (session.payment_status === "paid") {
            await fulfillCheckoutSession(session);
        }
        const packageId = metadata.packageId;
        const credits = packageId && CREDIT_PACKAGES[packageId] ? CREDIT_PACKAGES[packageId].credits : 0;
        let status = "unpaid";
        if (session.payment_status === "paid") {
            status = "paid";
        }
        else if (session.status === "open" || session.status === "complete") {
            status = "pending";
        }
        res.status(200).json({ status, credits });
    }
    catch (error) {
        console.error("Get session status error:", error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.getSessionStatus = getSessionStatus;
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
