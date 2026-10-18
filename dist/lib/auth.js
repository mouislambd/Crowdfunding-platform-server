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
const env = (k) => (process.env[k] ?? "").trim().replace(/\/+$/, "");
const client = new mongodb_2.MongoClient(env("MONGODB_URI"));
const db = client.db();
const isProduction = process.env.NODE_ENV === "production";
const BETTER_AUTH_URL = env("BETTER_AUTH_URL");
const CLIENT_URL = env("CLIENT_URL");
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, mongodb_1.mongodbAdapter)(db),
    secret: env("BETTER_AUTH_SECRET"),
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://crowdfunding-platform-client-flame.vercel.app",
        CLIENT_URL,
    ].filter(Boolean),
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
            allowDifferentEmails: false,
        },
    },
    advanced: {
        ...(isProduction
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
            }),
        ipAddress: {
            ipAddressHeaders: ["x-forwarded-for"],
        },
    },
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: env("GOOGLE_CLIENT_ID"),
            clientSecret: env("GOOGLE_CLIENT_SECRET"),
            redirectURI: `${BETTER_AUTH_URL}/api/auth/callback/google`,
            prompt: "select_account",
            mapProfileToUser: (profile) => ({
                role: "supporter",
                credits: 50,
            }),
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "supporter",
                input: true,
            },
            credits: {
                type: "number",
                required: false,
                defaultValue: 0,
                input: false,
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    try {
                        const normalizedRole = typeof user?.role === "string" ? user.role.trim().toLowerCase() : "supporter";
                        const role = normalizedRole === "builder" ? "builder" : "supporter";
                        const credits = role === "supporter" ? 50 : 20;
                        console.log("signup hook", user?.email, role, credits);
                        return {
                            data: {
                                ...user,
                                role,
                                credits,
                            },
                        };
                    }
                    catch (error) {
                        console.error("Error in databaseHooks.user.create.before:", error);
                        return {
                            data: {
                                ...user,
                                role: "supporter",
                                credits: 50,
                            },
                        };
                    }
                },
            },
        },
    },
});
console.log("account linking:", JSON.stringify(exports.auth.options.account));
