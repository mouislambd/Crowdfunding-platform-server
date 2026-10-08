import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
    createContribution,
    getMyContributions,
    getApprovedContributions,
    getPendingContributionsForCreator,
    approveContribution,
    rejectContribution,
} from "../controllers/contribution.controller";

const router = express.Router();

// Supporter routes
router.post(
    "/",
    requireAuth,
    requireRole("supporter"),
    createContribution
);
router.get(
    "/my-contributions",
    requireAuth,
    requireRole("supporter"),
    getMyContributions
);
router.get(
    "/approved",
    requireAuth,
    requireRole("supporter"),
    getApprovedContributions
);

// Creator routes
router.get(
    "/creator/pending",
    requireAuth,
    requireRole("creator"),
    getPendingContributionsForCreator
);
router.patch(
    "/approve/:id",
    requireAuth,
    requireRole("creator"),
    approveContribution
);
router.patch(
    "/reject/:id",
    requireAuth,
    requireRole("creator"),
    rejectContribution
);

export default router;