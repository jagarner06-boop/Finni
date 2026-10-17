import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ generate: vi.fn(), runTool: vi.fn(), history: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: mocks.generate }; }, FunctionCallingConfigMode: { ANY: 'ANY' } }));
vi.mock('../../env.js', () => ({ env: { GEMINI_API_KEY: 'test', GEMINI_MODEL: 'test', GEMINI_FALLBACK_MODEL: 'test' } }));
vi.mock('../../db/client.js', () => ({ db: { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: mocks.history }) }) }) }) }, schema: { chatMessages: {} } }));
vi.mock('../../services/accounts.js', () => ({ listAccounts: async () => [] }));
vi.mock('../../services/card.js', () => ({ getCardSummary: async () => null }));
vi.mock('../../services/nudges.js', () => ({ listNudges: async () => [] }));
vi.mock('../prompt.js', () => ({ systemPrompt: () => 'test' }));
vi.mock('../tools.js', () => ({ functionDeclarations: [{ name: 'propose_goal' }], runTool: mocks.runTool }));
import { runAgent } from '../loop.js';
import type { User } from '../../db/schema.js';
const user = { id: 'user' } as User;
const response = (text: string, functionCalls: unknown[] = []) => ({ text, functionCalls, candidates: [{ content: { role: 'model', parts: [{ text }] } }] });
beforeEach(() => { vi.clearAllMocks(); mocks.history.mockResolvedValue([]); });
describe('agent final replies', () => {
  it('actually calls a tool when the model writes a tool payload as text', async () => {
    mocks.generate.mockResolvedValueOnce(response('{"name":"propose_goal","args":{"name":"Laptop","target_amount":900}}')).mockResolvedValueOnce(response('', [{ name: 'propose_goal', args: { name: 'Laptop', target_amount: 900 } }])).mockResolvedValueOnce(response('[mood:happy] Ready'));
    mocks.runTool.mockResolvedValue({ proposed: true });
    await runAgent(user, 'Create a laptop goal for $900');
    expect(mocks.generate.mock.calls[1][0].config.toolConfig.functionCallingConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['propose_goal'] });
    expect(mocks.runTool).toHaveBeenCalledTimes(1);
  });
  it('shows a useful proposal confirmation if generation fails after a goal was proposed', async () => {
    mocks.generate.mockResolvedValueOnce(response('', [{ name: 'propose_goal', args: {} }])).mockRejectedValueOnce(new Error('model unavailable'));
    mocks.runTool.mockImplementationOnce(async (_name, _args, ctx) => {
      ctx.cards.push({ type: 'approval', actionId: 'a1', actionType: 'create_goal', title: 'Start a goal: Laptop', status: 'pending' });
      ctx.actionIds.push('a1');
      return { proposed: true };
    });
    const result = await runAgent(user, 'Create a laptop goal for $900');
    expect(result.text).toBe('Start a goal: Laptop. Tap Review to approve it.');
    expect(result.actionIds).toEqual(['a1']);
  });
});
