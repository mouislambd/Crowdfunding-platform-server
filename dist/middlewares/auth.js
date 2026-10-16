"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const auth_1 = require("../lib/auth");
const node_1 = require("better-auth/node");
const mongodb_1 = require("mongodb");
const client = new mongodb_1.MongoClient(process.env.MONGODB_URI);
const db = client.db();
const norm = (v) => String(v ?? "").trim().toLowerCase();
// Check if user is logged in
const requireAuth = async (req, res, next) => {
    try {
        const session = await auth_1.auth.api.getSession({
            headers: (0, node_1.fromNodeHeaders)(req.headers),
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
    }
    catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.requireAuth = requireAuth;
// Check if user has specific role(s)
const requireRole = (...roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
