"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const contribution_controller_1 = require("../controllers/contribution.controller");
const router = express_1.default.Router();
// Supporter routes
router.post("/", auth_1.requireAuth, (0, auth_1.requireRole)("supporter"), contribution_controller_1.createContribution);
router.get("/my-contributions", auth_1.requireAuth, (0, auth_1.requireRole)("supporter"), contribution_controller_1.getMyContributions);
router.get("/approved", auth_1.requireAuth, (0, auth_1.requireRole)("supporter"), contribution_controller_1.getApprovedContributions);
// Creator routes
router.get("/creator/pending", auth_1.requireAuth, (0, auth_1.requireRole)("creator"), contribution_controller_1.getPendingContributionsForCreator);
router.patch("/approve/:id", auth_1.requireAuth, (0, auth_1.requireRole)("creator"), contribution_controller_1.approveContribution);
router.patch("/reject/:id", auth_1.requireAuth, (0, auth_1.requireRole)("creator"), contribution_controller_1.rejectContribution);
exports.default = router;
