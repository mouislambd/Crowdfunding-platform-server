"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const report_controller_1 = require("../controllers/report.controller");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post("/", auth_1.requireAuth, (0, auth_1.requireRole)("supporter"), report_controller_1.createReport);
router.get("/", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), report_controller_1.getReports);
router.patch("/suspend/:campaignId", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), report_controller_1.suspendCampaign);
router.delete("/:campaignId", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), report_controller_1.deleteCampaign);
exports.default = router;
