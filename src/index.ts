import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import campaignRoutes from "./routes/campaign.routes";
import contributionRoutes from "./routes/contribution.routes";
import withdrawalRoutes from "./routes/withdrawal.routes";
import notificationRoutes from "./routes/notification.routes";
import paymentRoutes from "./routes/payment.routes";
import userRoutes from "./routes/user.routes";
import reportRoutes from "./routes/report.routes";
import publicRoutes from "./routes/public.routes";
import aiRoutes from "./routes/ai.routes";

const env = (k: string) => (process.env[k] ?? "").trim().replace(/\/+$/, "");
const CLIENT_URL = env("CLIENT_URL");

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                "http://localhost:3000",
                "https://crowdfunding-platform-client-flame.vercel.app",
                CLIENT_URL,
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);

// Better Auth handler MUST be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Crowdfunding Platform Server is running!");
});

app.get("/api/version", (req, res) => {
    res.json({ version: "ai-v2", time: new Date().toISOString() });
});

app.use("/api/ai", aiRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", publicRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/subscribers", publicRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Express error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI as string;
        if (!uri) {
            throw new Error("MONGODB_URI is not set");
        }
        await mongoose.connect(uri);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}

connectDB();

const groqKeyPresent = Boolean(process.env.GROQ_API_KEY?.trim());
console.log(`Mounted route prefixes: /api/auth, /api/ai, /api/campaigns, /api/contributions, /api/withdrawals, /api/notifications, /api/payments, /api/users, /api/reports, /api/public, /api/subscribers, /api/version | GROQ_API_KEY present: ${groqKeyPresent}`);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
