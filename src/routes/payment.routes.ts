import express from "express";
import { getMyPayments, createCheckoutSession, handleStripeWebhook } from "../controllers/payment.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = express.Router();

router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
router.post("/create-checkout-session", requireAuth, createCheckoutSession);
router.get("/my-payments", requireAuth, requireRole("supporter", "builder"), getMyPayments);

export default router;
