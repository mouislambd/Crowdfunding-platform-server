import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { MongoClient } from "mongodb";
import { Payment } from "../models/Payment";
import { Notification } from "../models/Notification";
import Stripe from "stripe";

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(uri);

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" as any }) : (null as any);

const CREDIT_PACKAGES: Record<string, { credits: number; amount: number; name: string }> = {
    p100: { credits: 100, amount: 10, name: "100 Credits" },
    p300: { credits: 300, amount: 25, name: "300 Credits" },
    p800: { credits: 800, amount: 60, name: "800 Credits" },
    p1500: { credits: 1500, amount: 110, name: "1500 Credits" },
};

export const requireStripeConfig = (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ message: "Payments are not configured" });
    }
    next();
};

export async function fulfillCheckoutSession(session: any) {
    if (session.payment_status !== "paid") return;

    const sessionId = session.id;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    const metadata = session.metadata || {};
    const userEmail = metadata.email;
    const packageId = metadata.packageId;

    if (!userEmail || !packageId || !CREDIT_PACKAGES[packageId]) return;

    const pkg = CREDIT_PACKAGES[packageId];

    const payment = await Payment.findOneAndUpdate(
        { stripe_session_id: sessionId, status: "pending" },
        {
            status: "success",
            stripe_payment_intent_id: paymentIntentId,
            transaction_id: paymentIntentId || sessionId,
        },
        { new: true }
    );

    if (payment) {
        const dbInstance = client.db();
        await dbInstance.collection("user").updateOne(
            { email: userEmail },
            { $inc: { credits: pkg.credits } }
        );

        await Notification.create({
            message: `Successfully purchased ${pkg.credits} credits!`,
            toEmail: userEmail,
            actionRoute: "/dashboard/supporter-home",
            time: new Date(),
        });
    }
}

export const createCheckoutSession = async (req: Request, res: Response) => {
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

        await Payment.create({
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
    } catch (error: any) {
        console.error("Stripe Checkout Session error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return res.status(400).send("Webhook Error: STRIPE_WEBHOOK_SECRET is not set");
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillCheckoutSession(session);
    }

    res.status(200).json({ received: true });
};

export const getSessionStatus = async (req: Request, res: Response) => {
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
        } else if (session.status === "open" || session.status === "complete") {
            status = "pending";
        }

        res.status(200).json({ status, credits });
    } catch (error: any) {
        console.error("Get session status error:", error.message);
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
