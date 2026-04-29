import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function getEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: 768,
  });
  const embedding = result.embedding;
  return embedding.values;
}

export async function generateChatResponse(
  prompt: string,
  contextSnippets: string[],
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const contextText = contextSnippets.join("\n\n");

  const systemPrompt = `You are Donky, a helpful AI assistant for BatBnB, a student housing app for Batangas State University students. 
Use the following listings context to answer the user's question. If the answer isn't in the context, just say you don't know based on the currently available listings. 
Be concise, friendly, and structure your responses easily for mobile viewing. Give the title, price, and address when suggesting a place.

Listings Context:
${contextText}

User Question:
${prompt}`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("Gemini failed", err);
    throw err;
  }
}
