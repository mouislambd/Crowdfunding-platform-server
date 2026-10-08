import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import campaignRoutes from "./routes/campaign.routes";
import contributionRoutes from "./routes/contribution.routes";
import withdrawalRoutes from "./routes/withdrawal.routes";
import notificationRoutes from "./routes/notification.routes";
import paymentRoutes from "./routes/payment.routes";
import userRoutes from "./routes/user.routes";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);

// Better Auth handler MUST be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Crowdfunding Platform Server is running!");
});

app.use("/api/campaigns", campaignRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);

async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI as string;
        await mongoose.connect(uri);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}

connectDB();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});