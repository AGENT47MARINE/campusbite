import "server-only";
import type { Content, FunctionDeclaration, Part } from "@google/genai";
import { getGemini } from "../gemini";
import { FALLBACK_MODEL, GEMINI_MODEL } from "../env";
import { ThinkingLevel } from "@google/genai";
import type { ChatMessage } from "../schemas";
import { tools } from "./tools";
import { toFunctionDeclarations } from "./defineTool";
import { buildSystemPrompt } from "./systemPrompt";
import type { AgentResult, AgentStep } from "./types";

/** Stops the agent from looping forever and using up your Gemini quota. */
const MAX_ROUNDS = 8;

/** Total time budget. Must stay below maxDuration in app/api/agent/route.ts. */
const TIME_BUDGET_MS = 45_000;

/**
 * Thinking makes Gemini slow (4+ seconds per round), which caused 504 timeouts on Vercel.
 * Ordering is simple, so keep thinking minimal.
 */
function thinkingConfig(model: string) {
  if (/gemini-2\.5/.test(model)) return { thinkingBudget: 0 };
  return { thinkingLevel: ThinkingLevel.LOW };
}

/**
 * THE AGENT LOOP
 * 1. Send the chat + the tool list to Gemini.
 * 2. If Gemini asks for tools, check the arguments with Zod and run them.
 * 3. Send the results back to Gemini.
 * 4. Repeat until Gemini gives a final text answer (or MAX_ROUNDS is reached).
 */
export async function runAgent(messages: ChatMessage[]): Promise<AgentResult> {
  const ai = getGemini();
  const steps: AgentStep[] = [];
  const functionDeclarations = toFunctionDeclarations(tools);

  const contents: Content[] = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const startedAt = Date.now();
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    const response = await generate(ai, contents, functionDeclarations);

    const calls = response.functionCalls ?? [];

    // No tool requested: this is the final answer.
    if (calls.length === 0) {
      return { reply: response.text?.trim() || "Sorry, I could not answer that.", steps };
    }

    // Keep Gemini's own turn (it carries the tool request) in the history.
    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);

    // Run read-only tools in parallel; writes run one by one, in order.
    const results: AgentStep[] = [];
    if (calls.every((c) => !tools.find((t) => t.name === c.name)?.writes)) {
      results.push(...(await Promise.all(calls.map((c) => runTool(c.name ?? "", c.args ?? {})))));
    } else {
      for (const c of calls) results.push(await runTool(c.name ?? "", c.args ?? {}));
    }
    const responseParts: Part[] = calls.map((call, i) => {
      const step = results[i];
      steps.push(step);
      return {
        functionResponse: {
          id: call.id,
          name: call.name,
          response: step.ok ? { result: step.result } : { error: step.error },
        },
      };
    });
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    reply: "That took too long. Please try again with a simpler or more specific request.",
    steps,
  };
}

/** Retries once on busy/slow Gemini errors, using a fallback model on the second try. */
async function generate(ai: ReturnType<typeof getGemini>, contents: Content[], functionDeclarations: FunctionDeclaration[]) {
  const models = [GEMINI_MODEL, FALLBACK_MODEL];
  for (let attempt = 0; ; attempt++) {
    const model = models[attempt];
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: buildSystemPrompt(),
          tools: [{ functionDeclarations }],
          temperature: 0.2,
          thinkingConfig: thinkingConfig(model),
          httpOptions: { timeout: 20_000 },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const transient = /429|500|503|504|DEADLINE|UNAVAILABLE|timed? ?out|abort|fetch failed/i.test(message);
      if (!transient || attempt >= models.length - 1) throw err;
      console.warn(`[agent] ${model} failed, retrying with ${models[attempt + 1]}:`, message.slice(0, 120));
    }
  }
}

async function runTool(name: string, rawArgs: unknown): Promise<AgentStep> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return { tool: name, args: rawArgs, ok: false, writes: false, error: `Unknown tool: ${name}` };
  }

  // Never trust the model's arguments: check them with Zod first.
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ");
    return { tool: name, args: rawArgs, ok: false, writes: tool.writes, error: `Invalid arguments: ${message}` };
  }

  try {
    const result = await tool.run(parsed.data);
    return { tool: name, args: parsed.data, ok: true, writes: tool.writes, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    console.error(`[tool ${name}]`, message); // shows tool errors in the terminal
    return { tool: name, args: parsed.data, ok: false, writes: tool.writes, error: message };
  }
}
