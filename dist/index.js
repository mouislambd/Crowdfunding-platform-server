"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const node_1 = require("better-auth/node");
const auth_1 = require("./lib/auth");
const campaign_routes_1 = __importDefault(require("./routes/campaign.routes"));
const contribution_routes_1 = __importDefault(require("./routes/contribution.routes"));
const withdrawal_routes_1 = __importDefault(require("./routes/withdrawal.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
dotenv_1.default.config();
const env = (k) => (process.env[k] ?? "").trim().replace(/\/+$/, "");
const CLIENT_URL = env("CLIENT_URL");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            "http://localhost:3000",
            "https://crowdfunding-platform-client-flame.vercel.app",
            CLIENT_URL,
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// Better Auth handler MUST be mounted before express.json()
app.all("/api/auth/*splat", (0, node_1.toNodeHandler)(auth_1.auth));
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Crowdfunding Platform Server is running!");
});
app.use("/api/campaigns", campaign_routes_1.default);
app.use("/api/contributions", contribution_routes_1.default);
app.use("/api/withdrawals", withdrawal_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/payments", payment_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/reports", report_routes_1.default);
async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose_1.default.connect(uri);
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}
connectDB();
console.log("BETTER_AUTH_URL:", env("BETTER_AUTH_URL"), "CLIENT_URL:", CLIENT_URL);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
