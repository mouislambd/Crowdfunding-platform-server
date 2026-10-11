"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const withdrawal_controller_1 = require("../controllers/withdrawal.controller");
const router = express_1.default.Router();
// Creator routes
router.post("/", auth_1.requireAuth, (0, auth_1.requireRole)("creator"), withdrawal_controller_1.createWithdrawal);
router.get("/my-withdrawals", auth_1.requireAuth, (0, auth_1.requireRole)("creator"), withdrawal_controller_1.getMyWithdrawals);
// Admin routes
router.get("/pending", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), withdrawal_controller_1.getPendingWithdrawals);
router.patch("/approve/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), withdrawal_controller_1.approveWithdrawal);
exports.default = router;
