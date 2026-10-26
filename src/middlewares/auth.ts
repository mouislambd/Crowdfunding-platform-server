import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(uri);
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

        let role = session.user.role;
        try {
            const dbUser = await db.collection("user").findOne({ email: session.user.email });
            if (dbUser && dbUser.role) {
                role = dbUser.role;
            }
        } catch (err) {
            console.error("role lookup failed", err);
        }

        req.user = {
            ...session.user,
            role: norm(role),
        };
        next();
    } catch (error) {
        console.error("requireAuth error", error);
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
            console.warn(`Forbidden: Insufficient permissions for user ${req.user.email}, role: ${req.user.role}`);
            return res
                .status(403)
                .json({ message: "Forbidden: Insufficient permissions" });
        }

        next();
    };
};