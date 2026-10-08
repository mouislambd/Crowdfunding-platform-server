import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
    createCampaign,
    getApprovedCampaigns,
    getTopFundedCampaigns,
    getCampaignById,
    getMyCampaigns,
    updateCampaign,
    deleteCampaign,
    getPendingCampaigns,
    approveCampaign,
    rejectCampaign,
    getAllCampaigns,
    adminDeleteCampaign,
} from "../controllers/campaign.controller";

const router = express.Router();

// Public routes
router.get("/approved", getApprovedCampaigns);
router.get("/top-funded", getTopFundedCampaigns);
router.get("/:id", getCampaignById);

// Builder routes
router.post("/", requireAuth, requireRole("builder"), createCampaign);
router.get(
    "/builder/my-campaigns",
    requireAuth,
    requireRole("builder"),
    getMyCampaigns
);
router.patch(
    "/:id",
    requireAuth,
    requireRole("builder"),
    updateCampaign
);
router.delete(
    "/:id",
    requireAuth,
    requireRole("builder"),
    deleteCampaign
);

// Admin routes
router.get(
    "/admin/pending",
    requireAuth,
    requireRole("admin"),
    getPendingCampaigns
);
router.patch(
    "/admin/approve/:id",
    requireAuth,
    requireRole("admin"),
    approveCampaign
);
router.patch(
    "/admin/reject/:id",
    requireAuth,
    requireRole("admin"),
    rejectCampaign
);
router.get(
    "/admin/all",
    requireAuth,
    requireRole("admin"),
    getAllCampaigns
);
router.delete(
    "/admin/:id",
    requireAuth,
    requireRole("admin"),
    adminDeleteCampaign
);

export default router;