import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db();

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

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

        const dbUser = await db.collection("user").findOne({ email: session.user.email });
        if (!dbUser) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        req.user = {
            ...session.user,
            role: norm(dbUser.role),
        };
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

        if (!roles.map(norm).includes(norm(req.user.role))) {
            return res
                .status(403)
                .json({ message: "Forbidden: Insufficient permissions" });
        }

        next();
    };
};