import express from "express";
import { createPayment, getMyPayments } from "../controllers/payment.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = express.Router();

router.post("/", requireAuth, requireRole("supporter"), createPayment);
router.get("/my-payments", requireAuth, getMyPayments);

export default router;
