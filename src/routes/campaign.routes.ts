import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
    createCampaign,
    getApprovedCampaigns,
    exploreCampaigns,
    getTopFundedCampaigns,
    getCampaignById,
    getCampaignUpdates,
    createCampaignUpdate,
    deleteCampaignUpdate,
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

// Public routes (must order /explore and /:id/updates BEFORE /:id)
router.get("/explore", exploreCampaigns);
router.get("/approved", getApprovedCampaigns);
router.get("/top-funded", getTopFundedCampaigns);
router.get("/:id/updates", getCampaignUpdates);
router.get("/:id", getCampaignById);

// Builder/Owner routes for updates
router.post("/:id/updates", requireAuth, requireRole("builder"), createCampaignUpdate);
router.delete("/:id/updates/:updateId", requireAuth, deleteCampaignUpdate);

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
