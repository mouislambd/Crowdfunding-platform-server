import "dotenv/config";
import { Request, Response } from "express";
import { MongoClient } from "mongodb";
import { Payment } from "../models/Payment";
import Stripe from "stripe";

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(uri);

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
}
const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-01-27.acacia" as any,
});

export const createCheckoutSession = async (req: Request, res: Response) => {
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
        await Payment.create({
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
    } catch (error: any) {
        console.error("Stripe Checkout Session error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
        if (!webhookSecret || webhookSecret === "whsec_test") {
            event = req.body as Stripe.Event;
        } else {
            event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
        }
    } catch (err: any) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (metadata && metadata.user_email && metadata.credits) {
            const userEmail = metadata.user_email;
            const credits = Number(metadata.credits);
            const sessionId = session.id;
            const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

            // 1. Update Payment status
            const payment = await Payment.findOneAndUpdate(
                { stripe_session_id: sessionId },
                {
                    status: "success",
                    stripe_payment_intent_id: paymentIntentId,
                    transaction_id: paymentIntentId || sessionId,
                },
                { new: true }
            );

            // 2. Increment user credits in MongoDB
            if (payment && payment.status === "success") {
                const dbInstance = client.db();
                await dbInstance.collection("user").updateOne(
                    { email: userEmail },
                    { $inc: { credits: credits } }
                );
            }
        }
    }

    res.status(200).json({ received: true });
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
