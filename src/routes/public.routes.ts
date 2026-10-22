import express, { Request, Response, NextFunction } from "express";
import { subscribe } from "../controllers/public.controller";

const router = express.Router();

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
    } else {
        record.count++;
        if (record.count > maxRequests) {
            return res.status(429).json({ message: "Too many requests, please try again later." });
        }
    }
    next();
};

router.post("/subscribe", rateLimitMiddleware, subscribe);
router.post("/", rateLimitMiddleware, subscribe);

export default router;
