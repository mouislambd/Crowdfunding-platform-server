import dotenv from "dotenv";
dotenv.config();

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db();

const isProduction = process.env.NODE_ENV === "production";

const env = (k: string) => (process.env[k] ?? "").trim().replace(/\/+$/, "");
const BETTER_AUTH_URL = env("BETTER_AUTH_URL");
const CLIENT_URL = env("CLIENT_URL");

export const auth = betterAuth({
    database: mongodbAdapter(db),
    secret: (process.env.BETTER_AUTH_SECRET ?? "").trim(),
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://crowdfunding-platform-client-flame.vercel.app",
        CLIENT_URL,
    ].filter(Boolean) as string[],
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
            clientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
            clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
            redirectURI: `${BETTER_AUTH_URL}/api/auth/callback/google`,
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
                before: async (user: any) => {
                    const normalizedRole = (user.role || "supporter").trim().toLowerCase();
                    const role = normalizedRole === "builder" ? "builder" : "supporter";
                    const credits = role === "supporter" ? 50 : 20;
                    console.log("signup hook", user.email, role, credits);
                    return {
                        data: {
                            ...user,
                            role,
                            credits,
                        },
                    };
                },
            },
        },
    },
});