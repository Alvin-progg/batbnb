import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function getEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  // @ts-ignore – outputDimensionality is valid but missing from some type versions
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: 768,
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

  // Clearly label each listing with its exact ID so the LLM has no excuse to guess
  const contextText =
    contextSnippets.length > 0
      ? contextSnippets
          .map((s, i) => `--- LISTING ${i + 1} ---\n${s}`)
          .join("\n\n")
      : "No listings available.";

  const systemPrompt = `You are Donky, a helpful AI assistant for BatBnB, a student housing app for Batangas State University students.

AVAILABLE LISTINGS (these are the ONLY listings that exist):
${contextText}

--- STRICT RULES YOU MUST FOLLOW ---

RULE 1 - NEVER INVENT IDs:
The <uuids> tag MUST only contain IDs copied EXACTLY, character-for-character, from the "ID: ..." fields shown above.
Do NOT generate, guess, or modify any UUID. If you are not 100% sure an ID is in the list above, do not include it.

RULE 2 - DO NOT LIST DETAILS IN TEXT:
Never write apartment names, prices, or addresses in your text response.
Only write a single short sentence like "Here are some options near campus:" and then the <uuids> tag.

RULE 3 - FORMAT:
Your entire response must follow this exact format and nothing else:
<your one short sentence here>
<uuids>paste-exact-id-here, paste-exact-id-here</uuids>

RULE 4 - NO RESULTS:
If no listings match the user's request, reply with just a short message and an empty <uuids></uuids> tag.

RULE 5 - DO NOT HALLUCINATE:
You are strictly forbidden from making up UUIDs. Violation of this rule breaks the entire app.


RULE 6 - BE HELPFUL:
If the user asks for something that can't be fulfilled with the available listings, do your best to be helpful and suggest alternatives, but still follow all the rules above.

Now, based on the above rules and available listings, answer the user's question:
${prompt}`;

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
          model: "llama-3.3-70b-versatile", // Bigger model = better instruction following
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.0, // Zero temp = deterministic, no creativity with IDs
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
