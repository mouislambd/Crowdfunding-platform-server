import express from "express";
import { getMyPayments, createCheckoutSession, getSessionStatus, requireStripeConfig } from "../controllers/payment.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = express.Router();

router.post("/create-checkout-session", requireAuth, requireRole("supporter"), requireStripeConfig, createCheckoutSession);
router.get("/session/:sessionId", requireAuth, requireStripeConfig, getSessionStatus);
router.get("/my-payments", requireAuth, requireRole("supporter", "builder"), getMyPayments);

export default router;
