"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const public_controller_1 = require("../controllers/public.controller");
const router = express_1.default.Router();
const rateLimitMap = new Map();
const rateLimitMiddleware = (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : Array.isArray(forwarded)
            ? forwarded[0]
            : req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 5;
    let record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        rateLimitMap.set(ip, record);
    }
    else {
        record.count++;
        if (record.count > maxRequests) {
            return res.status(429).json({ message: "Too many requests, please try again later." });
        }
    }
    next();
};
router.post("/subscribe", rateLimitMiddleware, public_controller_1.subscribe);
router.post("/", rateLimitMiddleware, public_controller_1.subscribe);
exports.default = router;
