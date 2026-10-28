import "dotenv/config";

const env = (k: string) => (process.env[k] ?? "").trim();

export interface ModelFailoverState {
    cooldownUntil: number;
    failCount: number;
    disabled: boolean;
}

const modelStates = new Map<string, ModelFailoverState>();
let availableModels: string[] = [];
let lastModelSyncTime = 0;

export function getGeminiApiKey(): string {
    const raw = process.env.GEMINI_API_KEY;
    if (!raw || typeof raw !== "string") {
        throw new Error("GEMINI_API_KEY is not set");
    }
    let trimmed = raw.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
    }
    if (!trimmed) {
        throw new Error("GEMINI_API_KEY is not set");
    }
    return trimmed;
}

export function getConfiguredModels(): string[] {
    const modelsEnv = env("GEMINI_MODELS") || env("GEMINI_MODEL") || "gemini-3.8-flash,gemini-3.7-flash,gemini-1.5-flash";
    const parsed = modelsEnv.split(",").map(m => m.trim()).filter(Boolean);
    return Array.from(new Set(parsed));
}

export async function syncModels(): Promise<string[]> {
    try {
        const apiKey = getGeminiApiKey();
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) {
            console.warn(`Failed to list Gemini models: status ${res.status}`);
            return getConfiguredModels();
        }
        const data = await res.json() as any;
        const apiModels = data.models || [];
        
        const supported = apiModels
            .filter((m: any) => {
                const methods = m.supportedGenerationMethods || [];
                return methods.includes("generateContent");
            })
            .map((m: any) => String(m.name || "").replace(/^models\//, ""));

        const configured = getConfiguredModels();
        const matched: string[] = [];
        const missing: string[] = [];

        for (const cfg of configured) {
            if (supported.includes(cfg)) {
                matched.push(cfg);
            } else {
                missing.push(cfg);
            }
        }

        if (missing.length > 0) {
            console.warn(`Warning: Configured Gemini models not found or not supporting generateContent: ${missing.join(", ")}`);
        }

        let finalModels = matched;
        if (finalModels.length === 0) {
            const excluded = ["tts", "transcribe", "lyria", "preview", "robotics", "computer-use", "deep-research", "antigravity", "omni"];
            const autoPicked = supported.filter((name: string) => {
                const lower = name.toLowerCase();
                if (!lower.includes("flash")) return false;
                for (const ex of excluded) {
                    if (lower.includes(ex)) return false;
                }
                return true;
            });
            if (autoPicked.length > 0) {
                finalModels = autoPicked;
                console.log(`Auto-picked Gemini flash models: ${finalModels.join(", ")}`);
            } else {
                finalModels = configured;
            }
        }

        availableModels = Array.from(new Set(finalModels));
        lastModelSyncTime = Date.now();

        for (const m of availableModels) {
            if (!modelStates.has(m)) {
                modelStates.set(m, { cooldownUntil: 0, failCount: 0, disabled: false });
            }
        }

        return availableModels;
    } catch (err) {
        console.error("Error syncing Gemini models:", err);
        return getConfiguredModels();
    }
}

setInterval(() => {
    syncModels().catch(err => console.error("Periodic model sync error:", err));
}, 6 * 3600 * 1000);

export async function getActiveModels(): Promise<string[]> {
    if (availableModels.length === 0 || Date.now() - lastModelSyncTime > 6 * 3600 * 1000) {
        await syncModels();
    }
    if (availableModels.length === 0) {
        return getConfiguredModels();
    }
    return availableModels;
}

export async function callGeminiJson(systemInstruction: string, userPrompt: string): Promise<any> {
    const apiKey = getGeminiApiKey();
    const models = await getActiveModels();

    let lastError: any = null;
    let soonestCooldownEnd = Infinity;

    for (const m of models) {
        if (!modelStates.has(m)) {
            modelStates.set(m, { cooldownUntil: 0, failCount: 0, disabled: false });
        }
    }

    for (const model of models) {
        const state = modelStates.get(model)!;
        const now = Date.now();

        if (state.disabled) {
            continue;
        }

        if (now < state.cooldownUntil) {
            if (state.cooldownUntil < soonestCooldownEnd) {
                soonestCooldownEnd = state.cooldownUntil;
            }
            continue;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: userPrompt }]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.3,
                    }
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text();
                const status = response.status;
                let errorMsg = text;
                try {
                    const parsed = JSON.parse(text);
                    errorMsg = parsed?.error?.message || text;
                } catch (e) {
                    // not json
                }

                state.failCount++;
                let cooldownSeconds = 30;
                const lowerMsg = errorMsg.toLowerCase();
                const lowerText = text.toLowerCase();

                if (status === 429) {
                    const retryAfterHeader = response.headers.get("Retry-After");
                    if (retryAfterHeader) {
                        const parsedSec = parseInt(retryAfterHeader, 10);
                        if (!isNaN(parsedSec)) {
                            cooldownSeconds = parsedSec;
                        }
                    }
                    if (lowerMsg.includes("quota") || lowerMsg.includes("exceeded") || lowerMsg.includes("limit") || lowerMsg.includes("day") || lowerMsg.includes("daily") || lowerText.includes("resource_exhausted")) {
                        const midnight = new Date();
                        midnight.setUTCHours(24, 0, 0, 0);
                        cooldownSeconds = Math.max(60, Math.ceil((midnight.getTime() - Date.now()) / 1000));
                    } else if (cooldownSeconds === 30 && !retryAfterHeader) {
                        cooldownSeconds = 60;
                    }
                    state.cooldownUntil = Date.now() + cooldownSeconds * 1000;
                    console.error(`Gemini model ${model} rate limited (429). Cooldown: ${cooldownSeconds}s.`);
                    if (state.cooldownUntil < soonestCooldownEnd) {
                        soonestCooldownEnd = state.cooldownUntil;
                    }
                    lastError = new Error(`Gemini API error (429): ${errorMsg}`);
                    lastError.status = 429;
                    lastError.code = "RATE_LIMIT";
                    continue;
                }

                if (status === 404 || lowerMsg.includes("not found") || lowerMsg.includes("not supported") || lowerMsg.includes("decommissioned") || lowerMsg.includes("does not exist") || lowerMsg.includes("not have access")) {
                    state.disabled = true;
                    console.error(`Gemini model ${model} disabled due to status ${status}: ${errorMsg}`);
                    lastError = new Error(`Gemini API error (${status}): ${errorMsg}`);
                    lastError.status = status;
                    lastError.code = "MODEL_ERROR";
                    continue;
                }

                if (status === 500 || status === 503 || lowerMsg.includes("timeout") || lowerMsg.includes("abort")) {
                    cooldownSeconds = 30;
                    state.cooldownUntil = Date.now() + cooldownSeconds * 1000;
                    console.error(`Gemini model ${model} server error (${status}). Cooldown: ${cooldownSeconds}s.`);
                    if (state.cooldownUntil < soonestCooldownEnd) {
                        soonestCooldownEnd = state.cooldownUntil;
                    }
                    lastError = new Error(`Gemini API error (${status}): ${errorMsg}`);
                    lastError.status = status;
                    lastError.code = "SERVER_ERROR";
                    continue;
                }

                if (status === 400 || status === 401 || status === 403) {
                    console.error(`Gemini model ${model} fatal error (${status}): ${errorMsg}`);
                    const err: any = new Error(`Gemini API error (${status}): ${errorMsg}`);
                    err.status = status;
                    err.code = status === 401 || status === 403 ? "UNAUTHORIZED" : "AI_BAD_REQUEST";
                    throw err;
                }

                cooldownSeconds = 30;
                state.cooldownUntil = Date.now() + cooldownSeconds * 1000;
                lastError = new Error(`Gemini API error (${status}): ${errorMsg}`);
                lastError.status = status;
                lastError.code = "AI_ERROR";
                continue;
            }

            const data = await response.json() as any;
            const candidate = data.candidates?.[0];
            const partText = candidate?.content?.parts?.[0]?.text;
            if (!partText) {
                throw new Error("Empty response content from Gemini");
            }

            let cleanContent = partText.trim();
            if (cleanContent.startsWith("```")) {
                cleanContent = cleanContent.replace(/^```(json)?\n?/i, "").replace(/\n?```$/, "").trim();
            }

            try {
                return JSON.parse(cleanContent);
            } catch (e) {
                return { reply: partText, actions: [], needsMore: false };
            }

        } catch (err: any) {
            lastError = err;
            const status = err?.status;
            if (status === 400 || status === 401 || status === 403 || err?.code === "AI_BAD_REQUEST" || err?.code === "UNAUTHORIZED") {
                throw err;
            }

            const state = modelStates.get(model)!;
            state.failCount++;
            const cooldownSeconds = 30;
            state.cooldownUntil = Date.now() + cooldownSeconds * 1000;
            if (state.cooldownUntil < soonestCooldownEnd) {
                soonestCooldownEnd = state.cooldownUntil;
            }
            console.error(`Gemini model ${model} failed: ${err?.message || err}`);
        }
    }

    const now = Date.now();
    let retryAfterSeconds = 60;
    if (soonestCooldownEnd !== Infinity && soonestCooldownEnd > now) {
        retryAfterSeconds = Math.ceil((soonestCooldownEnd - now) / 1000);
    }
    const err: any = new Error("All AI models are currently unavailable or rate limited.");
    err.code = "AI_UNAVAILABLE";
    err.status = 503;
    err.retryAfterSeconds = retryAfterSeconds;
    throw err;
}

export function getModelsStatus(): Array<{ name: string; disabled: boolean; cooldownRemainingSeconds: number; failCount: number }> {
    const models = availableModels.length > 0 ? availableModels : getConfiguredModels();
    const now = Date.now();
    return models.map(m => {
        const state = modelStates.get(m) || { cooldownUntil: 0, failCount: 0, disabled: false };
        const remaining = state.cooldownUntil > now ? Math.ceil((state.cooldownUntil - now) / 1000) : 0;
        return {
            name: m,
            disabled: state.disabled,
            cooldownRemainingSeconds: remaining,
            failCount: state.failCount,
        };
    });
}
