import express from "express";
import { createReport, getReports, suspendCampaign, deleteCampaign } from "../controllers/report.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = express.Router();

router.post("/", requireAuth, requireRole("supporter"), createReport);
router.get("/", requireAuth, requireRole("admin"), getReports);
router.patch("/suspend/:campaignId", requireAuth, requireRole("admin"), suspendCampaign);
router.delete("/:campaignId", requireAuth, requireRole("admin"), deleteCampaign);

export default router;
