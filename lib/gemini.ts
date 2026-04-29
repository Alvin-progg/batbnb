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
  const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error("Missing EXPO_PUBLIC_GROQ_API_KEY in .env");
  }

  const contextText = contextSnippets.join("\n\n");
  {
    /**
CRITICAL UI RULE: You MUST NOT list out the names, prices, or details of the apartments directly in your text response! Instead, you will give a short introductory sentence (e.g. "Here are some great spots near campus:"), and then immediately output the exact UUIDs of those apartments in a <uuids> XML tag at the very end. The app will automatically render beautiful interactive UI cards for them!

Example Format:
I found some affordable options near the engineering building for you!
<uuids>a1b2c3d4-..., f5e6d7c8-...</uuids> */
  }
  const systemPrompt = `You are Donky, a helpful AI assistant for BatBnB, a student housing app for Batangas State University students. 
For responses, you MUST follow these rules:
- You MUST NOT list out the names, prices, or details of the apartments directly in your text response! Instead, you will give a short introductory sentence (e.g. "Here are some great spots near campus:"), and then immediately output the exact UUIDs of those apartments in a <uuids> XML tag at the very end. The app will automatically render beautiful interactive UI cards for them!
- You MUST ONLY return apartment listings that are relevant to the user's query and the provided context. If there are no relevant listings, you MUST return an empty list of UUIDs.
- You MUST NOT make up any apartment listings that are not in the provided context.
- You MUST ensure that the UUIDs you return are formatted correctly as valid UUID strings.


Listings Context:
${contextText}`;

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
          model: "llama-3.1-8b-instant", // Lightning fast LLM
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.2, // Lower temperature makes it more accurate at filtering numbers
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
