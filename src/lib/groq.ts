import dotenv from "dotenv";
dotenv.config();

const env = (k: string) => (process.env[k] ?? "").trim();

export async function chatJson(messages: Array<{ role: string; content: string }>): Promise<any> {
    const apiKey = env("GROQ_API_KEY");
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const defaultModel = env("GROQ_MODEL") || "llama-3.3-70b-versatile";
    const fallbackEnv = env("GROQ_FALLBACK_MODELS");
    const fallbacks = fallbackEnv
        ? fallbackEnv.split(",").map(m => m.trim()).filter(Boolean)
        : ["llama-3.1-8b-instant"];

    const modelsToTry = [defaultModel, ...fallbacks];
    const uniqueModels = Array.from(new Set(modelsToTry));

    let lastError: any = null;

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
                const lowerText = text.toLowerCase();
                const isRetryable =
                    status === 400 ||
                    status === 404 ||
                    status === 429 ||
                    status >= 500 ||
                    lowerText.includes("decommissioned") ||
                    lowerText.includes("model_not_found");

                if (isRetryable) {
                    console.error(`Groq status ${status}: model ${model} failed`);
                    continue;
                } else {
                    throw new Error(`Groq API error (${status}): ${text}`);
                }
            }

            const data = await response.json() as any;
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error("Empty response content from Groq");
            }

            return JSON.parse(content);
        } catch (err: any) {
            lastError = err;
            const msg = String(err?.message || err).toLowerCase();
            const isRetryable =
                msg.includes("abort") ||
                msg.includes("timeout") ||
                msg.includes("decommissioned") ||
                msg.includes("model_not_found") ||
                msg.includes("400") ||
                msg.includes("404") ||
                msg.includes("429") ||
                msg.includes("5") ||
                err?.status === 400 ||
                err?.status === 404 ||
                err?.status === 429 ||
                (err?.status >= 500 && err?.status < 600);

            console.error(`Groq error: model ${model} failed`, err?.message || err);
            if (!isRetryable) {
                throw err;
            }
        }
    }

    throw lastError || new Error("All Groq AI models failed.");
}
