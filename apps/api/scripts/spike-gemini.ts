// Foundation spike: one Gemini function-calling round trip.
import { GoogleGenAI, Type, type Content } from "@google/genai";
import { env } from "../src/env.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_accounts",
        description: "List the user's bank accounts with balances.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
    ],
  },
];

const contents: Content[] = [{ role: "user", parts: [{ text: "How much money do I have?" }] }];
const config = {
  tools,
  systemInstruction: "You are Finn, a friendly fish who helps with money. Start every final reply with [mood:happy|worried|celebrating].",
};

const first = await ai.models.generateContent({ model: env.GEMINI_MODEL, contents, config });
const call = first.functionCalls?.[0];
console.log("function call:", call?.name, call?.args);

contents.push(first.candidates![0].content!);
contents.push({
  role: "user",
  parts: [{ functionResponse: { name: "get_accounts", response: { accounts: [{ nickname: "Everyday", balance: 1240.55 }] } } }],
});

const second = await ai.models.generateContent({ model: env.GEMINI_MODEL, contents, config });
console.log("final:", second.text);
