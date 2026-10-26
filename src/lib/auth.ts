import "dotenv/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const env = (k: string) => (process.env[k] ?? "").trim().replace(/\/+$/, "");

const mongoUri = env("MONGODB_URI");
if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
}

const client = new MongoClient(mongoUri);
const db = client.db();

const isProduction = process.env.NODE_ENV === "production";

const BETTER_AUTH_URL = env("BETTER_AUTH_URL");
const CLIENT_URL = env("CLIENT_URL");

export const auth = betterAuth({
    database: mongodbAdapter(db),
    secret: env("BETTER_AUTH_SECRET"),
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: [
        "http://localhost:3000",
        "https://crowdfunding-platform-client-flame.vercel.app",
        CLIENT_URL,
    ].filter(Boolean) as string[],
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
                before: async (user: any) => {
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
                    } catch (error) {
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

console.log("account linking:", JSON.stringify(auth.options.account));