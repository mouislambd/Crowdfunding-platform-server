"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroqApiKey = getGroqApiKey;
exports.getModelsToTry = getModelsToTry;
exports.chatJson = chatJson;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = (k) => (process.env[k] ?? "").trim();
function getGroqApiKey() {
    const raw = process.env.GROQ_API_KEY;
    if (!raw || typeof raw !== "string") {
        throw new Error("GROQ_API_KEY is not set");
    }
    let trimmed = raw.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
    }
    if (!trimmed) {
        throw new Error("GROQ_API_KEY is not set");
    }
    return trimmed;
}
function getModelsToTry() {
    const modelsEnv = env("GROQ_MODELS");
    if (modelsEnv) {
        const parsed = modelsEnv.split(",").map(m => m.trim()).filter(Boolean);
        if (parsed.length > 0) {
            return Array.from(new Set(parsed));
        }
    }
    const defaultModel = env("GROQ_MODEL") || "qwen/qwen3.8-27b";
    const fallbackEnv = env("GROQ_FALLBACK_MODELS");
    const fallbacks = fallbackEnv
        ? fallbackEnv.split(",").map(m => m.trim()).filter(Boolean)
        : [
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "allam-2-7b",
            "canopylabs/orpheus-v1-english"
        ];
    return Array.from(new Set([defaultModel, ...fallbacks]));
}
async function chatJson(messages) {
    const apiKey = getGroqApiKey();
    const uniqueModels = getModelsToTry();
    let lastError = null;
    for (const model of uniqueModels) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    response_format: { type: "json_object" },
                    temperature: 0.3,
                    max_tokens: 600,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const text = await response.text();
                const status = response.status;
                let groqErrCode = "UNKNOWN";
                let groqErrMsg = text;
                try {
                    const parsed = JSON.parse(text);
                    groqErrCode = parsed?.error?.code || "UNKNOWN";
                    groqErrMsg = parsed?.error?.message || text;
                }
                catch (e) {
                    // not json
                }
                console.error(`Groq error: model ${model} failed with status ${status}`);
                const err = new Error(`Groq API error (${status}): ${groqErrMsg}`);
                err.status = status;
                err.code = groqErrCode;
                err.groqMessage = groqErrMsg;
                if (status === 401) {
                    throw err;
                }
                const lowerText = text.toLowerCase();
                const isRetryable = status === 400 ||
                    status === 404 ||
                    status === 429 ||
                    status >= 500 ||
                    lowerText.includes("decommissioned") ||
                    lowerText.includes("model_not_found") ||
                    lowerText.includes("does not exist") ||
                    lowerText.includes("not have access");
                if (isRetryable) {
                    lastError = err;
                    continue;
                }
                else {
                    throw err;
                }
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error("Empty response content from Groq");
            }
            return JSON.parse(content);
        }
        catch (err) {
            lastError = err;
            const msg = String(err?.message || err).toLowerCase();
            const status = err?.status;
            if (status === 401) {
                throw err;
            }
            const isRetryable = status === 400 ||
                status === 404 ||
                status === 429 ||
                (status >= 500 && status < 600) ||
                msg.includes("abort") ||
                msg.includes("timeout") ||
                msg.includes("decommissioned") ||
                msg.includes("model_not_found") ||
                msg.includes("does not exist") ||
                msg.includes("not have access") ||
                msg.includes("400") ||
                msg.includes("404") ||
                msg.includes("429") ||
                msg.includes("5");
            console.error(`Groq error: model ${model} failed with status ${status || 500}`);
            if (!isRetryable) {
                throw err;
            }
        }
    }
    throw lastError || new Error("All Groq AI models failed.");
}
