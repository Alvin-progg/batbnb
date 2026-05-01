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
  });
  return result.embedding.values;
}

export async function generateChatResponse(
  prompt: string,
  contextSnippets: string[],
): Promise<string> {
  const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error("Missing EXPO_PUBLIC_GROQ_API_KEY in .env");
  }

  const contextText =
    contextSnippets.length > 0
      ? contextSnippets
        .map((s, i) => `--- LISTING ${i + 1} ---\n${s}`)
        .join("\n\n")
      : "No listings available.";

  const systemPrompt = `You are Donky, a friendly and helpful AI assistant for BatBnB — a student housing app for Batangas State University students. You help students find affordable housing, answer questions about renting, and give practical advice about student life in Batangas.

You have access to real listings from the database. Here they are:
${contextText}

--- HOW TO RESPOND ---

For casual conversation, greetings, or general questions (e.g. "hi", "how are you", "what can you do", "tips for renting"):
→ Just reply naturally in plain text. Do NOT show listings. Do NOT include a <uuids> tag at all.

For housing searches or when the user is clearly looking for a place (e.g. "find me a room", "show apartments under 4k", "near BatStateU"):
→ Write a short helpful sentence, then add a <uuids> tag with the exact IDs of matching listings from the context above.
→ Format: 
   Here are some options that match!
   <uuids>exact-id-from-above, exact-id-from-above</uuids>

--- UUID RULES ---
- ONLY use IDs that appear exactly in the listing context above. Copy them character-for-character.
- NEVER invent, guess, or modify a UUID. If unsure, leave it out.
- If no listings match, just say so in plain text with no <uuids> tag.

Be warm, concise, and helpful. You're talking to college students — keep it friendly and practical.`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.0,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error("Groq failed", err);
    throw err;
  }
}
