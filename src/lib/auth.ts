import dotenv from "dotenv";
dotenv.config();

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db();

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
    database: mongodbAdapter(db),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://crowdfunding-platform-client-flame.vercel.app",
        (process.env.CLIENT_URL || "").replace(/\/$/, ""),
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
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
});