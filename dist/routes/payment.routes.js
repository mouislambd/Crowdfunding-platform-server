"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post("/create-checkout-session", auth_1.requireAuth, (0, auth_1.requireRole)("supporter"), payment_controller_1.requireStripeConfig, payment_controller_1.createCheckoutSession);
router.get("/session/:sessionId", auth_1.requireAuth, payment_controller_1.requireStripeConfig, payment_controller_1.getSessionStatus);
router.get("/my-payments", auth_1.requireAuth, (0, auth_1.requireRole)("supporter", "builder"), payment_controller_1.getMyPayments);
exports.default = router;
