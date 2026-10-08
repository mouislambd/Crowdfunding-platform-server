import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

// Check if user is logged in
export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized: Please login" });
        }

        req.user = session.user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

// Check if user has specific role(s)
export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!roles.map(r => r.toLowerCase()).includes(req.user.role?.toLowerCase())) {
            return res
                .status(403)
                .json({ message: "Forbidden: Insufficient permissions" });
        }

        next();
    };
};