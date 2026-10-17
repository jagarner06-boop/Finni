// Synthetic prompts only. No database queries, real account reads, or action execution.
import { FunctionCallingConfigMode, GoogleGenAI, type Content } from "@google/genai";
import { env } from "../src/env.js";
import { functionDeclarations } from "../src/agent/tools.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const requested = process.argv.slice(2);
const models = [...new Set(requested.length ? requested : [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL, "gemini-3.5-flash-lite"])];
const working: string[] = [];
const httpOptions = { timeout: 12_000 };
const tools = [{ functionDeclarations }];
console.log(`Configured primary: ${env.GEMINI_MODEL}; fallback: ${env.GEMINI_FALLBACK_MODEL}`);

for (const model of models) {
  let stage = "plain text";
  const started = Date.now();
  try {
    const plain = await ai.models.generateContent({ model, contents: "Reply with OK.", config: { httpOptions } });
    if (!plain.text?.trim()) throw new Error(`No text returned (finish reason: ${plain.candidates?.[0]?.finishReason ?? "none"})`);
    console.log(`PASS ${model}: plain text`);

    stage = "Finni tool declarations";
    const contents: Content[] = [{ role: "user", parts: [{ text: "Diagnostic with synthetic data: call get_accounts to see what accounts are available." }] }];
    const first = await ai.models.generateContent({ model, contents, config: { httpOptions, tools,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ["get_accounts"] } },
    } });
    const calls = first.functionCalls ?? [];
    const content = first.candidates?.[0]?.content;
    if (!content || !calls.length || calls.some((c) => c.name !== "get_accounts")) throw new Error("Expected get_accounts function call was not returned");
    console.log(`PASS ${model}: actual Finni tool declarations accepted`);

    stage = "answer after tool response";
    contents.push(content, { role: "user", parts: calls.map((call) => ({ functionResponse: { id: call.id, name: call.name!, response: { result: { accounts: [] } } } })) });
    const final = await ai.models.generateContent({ model, contents, config: { httpOptions, tools,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.NONE } },
    } });
    if (!final.text?.trim()) throw new Error(`No answer after tool response (finish reason: ${final.candidates?.[0]?.finishReason ?? "none"})`);
    console.log(`PASS ${model}: tool round trip (${Date.now() - started}ms)`);
    working.push(model);
  } catch (error) {
    const e = error as { status?: number; code?: string; message?: string };
    let detail = e.message ?? String(error);
    for (const secret of [env.GEMINI_API_KEY, env.NESSIE_KEY, env.DATABASE_URL]) if (secret) detail = detail.replaceAll(secret, "[redacted]");
    console.error(`FAIL ${model}: ${stage}; status=${e.status ?? e.code ?? "network/unknown"}; ${detail.slice(0, 1500)}`);
  }
}
console.log(working.length ? `Working tool-capable models: ${working.join(", ")}` : "No tested model completed a tool round trip. Inspect the status and provider message above.");
process.exit(working.length ? 0 : 1);
