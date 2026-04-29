require("dotenv").config({ path: `${__dirname}/../.env` });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");

// Initialize Gemini
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing EXPO_PUBLIC_GEMINI_API_KEY in .env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Initialize Supabase
const supaUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supaKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Note: Normally you need a service_role key to update embeddings from a script if RLS blocks writers,
// but let's assume your dev RLS allows anon full access temporarily based on prior sessions.
const supabase = createClient(supaUrl, supaKey);

async function backfillEmbeddings() {
  console.log("Fetching listings without embeddings...");

  // We look for listings where embedding is null
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, subtitle, monthly_rent, location, meta")
    .is("embedding", null);

  if (error) {
    console.error("Error fetching listings:", error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log("No listings need embeddings! You're all caught up.");
    return;
  }

  console.log(`Found ${listings.length} listings. Generating embeddings...`);

  for (const listing of listings) {
    console.log(`Embedding: ${listing.title}`);

    // Create the text chunks we care about
    const textToEmbed = `${listing.title}
Location: ${listing.location}
Rent: Php ${listing.monthly_rent}
Subtitle/Keywords: ${listing.subtitle}
Features/Meta: ${listing.meta}`;

    try {
      const ObjectToEmbed = {
        content: { role: "user", parts: [{ text: textToEmbed }] },
        outputDimensionality: 768,
      };
      const result = await model.embedContent(ObjectToEmbed);
      const embeddingArray = result.embedding.values;

      // Update Supabase
      const { error: updateError } = await supabase
        .from("listings")
        .update({ embedding: embeddingArray })
        .eq("id", listing.id);

      if (updateError) {
        console.error(`Failed to update ${listing.title}:`, updateError);
      } else {
        console.log(`✅ Success for ${listing.title}`);
      }
    } catch (err) {
      console.error(`Failed to embed ${listing.title}:`, err);
    }
  }
}

backfillEmbeddings();
