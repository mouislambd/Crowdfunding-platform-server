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

// Builder routes
router.get(
    "/creator/pending",
    requireAuth,
    requireRole("builder"),
    getPendingContributionsForCreator
);
router.get(
    "/builder/pending",
    requireAuth,
    requireRole("builder"),
    getPendingContributionsForCreator
);
router.patch(
    "/approve/:id",
    requireAuth,
    requireRole("builder"),
    approveContribution
);
router.patch(
    "/reject/:id",
    requireAuth,
    requireRole("builder"),
    rejectContribution
);

export default router;