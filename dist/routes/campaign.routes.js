"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const campaign_controller_1 = require("../controllers/campaign.controller");
const router = express_1.default.Router();
// Public routes
router.get("/approved", campaign_controller_1.getApprovedCampaigns);
router.get("/top-funded", campaign_controller_1.getTopFundedCampaigns);
router.get("/:id", campaign_controller_1.getCampaignById);
// Builder routes
router.post("/", auth_1.requireAuth, (0, auth_1.requireRole)("builder"), campaign_controller_1.createCampaign);
router.get("/builder/my-campaigns", auth_1.requireAuth, (0, auth_1.requireRole)("builder"), campaign_controller_1.getMyCampaigns);
router.patch("/:id", auth_1.requireAuth, (0, auth_1.requireRole)("builder"), campaign_controller_1.updateCampaign);
router.delete("/:id", auth_1.requireAuth, (0, auth_1.requireRole)("builder"), campaign_controller_1.deleteCampaign);
// Admin routes
router.get("/admin/pending", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), campaign_controller_1.getPendingCampaigns);
router.patch("/admin/approve/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), campaign_controller_1.approveCampaign);
router.patch("/admin/reject/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), campaign_controller_1.rejectCampaign);
router.get("/admin/all", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), campaign_controller_1.getAllCampaigns);
router.delete("/admin/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), campaign_controller_1.adminDeleteCampaign);
exports.default = router;
