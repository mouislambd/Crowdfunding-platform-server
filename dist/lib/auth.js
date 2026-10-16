"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const better_auth_1 = require("better-auth");
const mongodb_1 = require("better-auth/adapters/mongodb");
const mongodb_2 = require("mongodb");
const client = new mongodb_2.MongoClient(process.env.MONGODB_URI);
const db = client.db();
const isProduction = process.env.NODE_ENV === "production";
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, mongodb_1.mongodbAdapter)(db),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://crowdfunding-platform-client-flame.vercel.app",
        (process.env.CLIENT_URL || "").replace(/\/$/, ""),
    ].filter(Boolean),
    advanced: isProduction
        ? {
            useSecureCookies: true,
            defaultCookieAttributes: {
                sameSite: "none",
                secure: true,
                httpOnly: true,
            },
        }
        : {
            defaultCookieAttributes: {
                sameSite: "lax",
                secure: false,
            },
        },
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "supporter",
            },
            credits: {
                type: "number",
                required: false,
                defaultValue: 0,
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (data) => {
                    const role = data.role === "builder" ? "builder" : "supporter";
                    const credits = role === "supporter" ? 50 : 20;
                    return {
                        ...data,
                        role,
                        credits,
                    };
                },
            },
        },
    },
});
