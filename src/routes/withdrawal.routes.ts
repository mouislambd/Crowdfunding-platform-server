import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
    createWithdrawal,
    getMyWithdrawals,
    getPendingWithdrawals,
    approveWithdrawal,
} from "../controllers/withdrawal.controller";

const router = express.Router();

// Creator routes
router.post("/", requireAuth, requireRole("builder"), createWithdrawal);
router.get(
    "/my-withdrawals",
    requireAuth,
    requireRole("builder"),
    getMyWithdrawals
);

// Admin routes
router.get(
    "/pending",
    requireAuth,
    requireRole("admin"),
    getPendingWithdrawals
);
router.patch(
    "/approve/:id",
    requireAuth,
    requireRole("admin"),
    approveWithdrawal
);

export default router;