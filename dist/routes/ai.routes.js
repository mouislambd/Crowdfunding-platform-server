"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ai_controller_1 = require("../controllers/ai.controller");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
const rateLimits = new Map();
function rateLimit(limit, windowMs = 60000) {
    return (req, res, next) => {
        const identifier = req.user?.id ||
            req.user?.email ||
            req.headers["x-forwarded-for"] ||
            req.ip ||
            "unknown";
        const key = `${req.baseUrl}${req.path}:${identifier}`;
        const now = Date.now();
        let timestamps = rateLimits.get(key) || [];
        timestamps = timestamps.filter(t => now - t < windowMs);
        if (timestamps.length >= limit) {
            return res.status(429).json({ message: "Too many requests, please try again later.", code: "RATE_LIMIT", detail: "Too many requests" });
        }
        timestamps.push(now);
        rateLimits.set(key, timestamps);
        next();
    };
}
router.get("/health", ai_controller_1.healthController);
router.get("/status", auth_1.requireAuth, ai_controller_1.statusController);
router.post("/agent", rateLimit(15, 60000), ai_controller_1.agentController);
router.post("/draft-campaign", auth_1.requireAuth, (0, auth_1.requireRole)("builder"), rateLimit(5, 60000), ai_controller_1.draftCampaignController);
exports.default = router;
