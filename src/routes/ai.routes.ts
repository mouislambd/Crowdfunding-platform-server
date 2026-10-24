import express, { Request, Response, NextFunction } from "express";
import { assistantController, draftCampaignController } from "../controllers/ai.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = express.Router();

const rateLimits = new Map<string, number[]>();

function rateLimit(limit: number, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
        const identifier =
            req.user?.id ||
            req.user?.email ||
            (req.headers["x-forwarded-for"] as string) ||
            req.ip ||
            "unknown";

        const key = `${req.baseUrl}${req.path}:${identifier}`;
        const now = Date.now();
        let timestamps = rateLimits.get(key) || [];
        timestamps = timestamps.filter(t => now - t < windowMs);

        if (timestamps.length >= limit) {
            return res.status(429).json({ message: "Too many requests, please try again later." });
        }

        timestamps.push(now);
        rateLimits.set(key, timestamps);
        next();
    };
}

router.post("/assistant", rateLimit(15, 60000), assistantController);
router.post("/draft-campaign", requireAuth, requireRole("builder"), rateLimit(5, 60000), draftCampaignController);

export default router;
