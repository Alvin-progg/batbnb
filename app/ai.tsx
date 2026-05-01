import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, SendHorizontal, Sparkles } from "lucide-react-native";
import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { generateChatResponse, getEmbedding } from "../lib/gemini";
import { supabase } from "../lib/supabase";

type ChatRole = "bot" | "user";

type Listing = {
  id: string;
  title: string;
  location: string;
  monthly_rent: number;
  status?: string;
  subtitle?: string;
  meta?: string;
};

type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
  suggestedListings?: Listing[];
};



const UUID_REGEX =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

function normalizeListing(raw: any): Listing | null {
  const id = String(raw?.id ?? raw?.listing_id ?? "").toLowerCase();
  if (!id) return null;

  return {
    id,
    title: String(raw?.title ?? "Untitled listing"),
    location: String(raw?.location ?? "Unknown location"),
    monthly_rent: Number(raw?.monthly_rent ?? 0),
    status: raw?.status ? String(raw.status) : undefined,
    subtitle: raw?.subtitle ? String(raw.subtitle) : undefined,
    meta: raw?.meta ? String(raw.meta) : undefined,
  };
}

async function fetchFallbackListings(): Promise<Listing[]> {
  const { data, error } = await (supabase as any)
    .from("listings")
    .select("id, title, subtitle, meta, monthly_rent, location, status")
    .eq("status", "active")
    .limit(10);

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => normalizeListing(row))
    .filter((row: Listing | null): row is Listing => row !== null);
}

function createInitialMessages(listing?: string): ChatMessage[] {
  const intro = listing
    ? `I can help with ${listing}. Ask for availability, commute time, or student reviews.`
    : "Tell me your budget and preferred area in Batangas, and I will suggest student-friendly options.";

  return [
    { id: 1, role: "bot", text: "Hi, I am Donky." },
    { id: 2, role: "bot", text: intro },
  ];
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ listing?: string | string[] }>();
  const listing = Array.isArray(params.listing)
    ? params.listing[0]
    : params.listing;

  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    createInitialMessages(listing),
  );

  const sendMessage = React.useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const userMessageId = Date.now();
    const botMessageId = userMessageId + 1;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", text },
      { id: botMessageId, role: "bot", text: "Thinking..." },
    ]);
    setDraft("");

    try {
      const queryEmbedding = await getEmbedding(text);

      const { data: closestListings, error } = await (supabase as any).rpc(
        "match_listings",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 10,
        },
      );

      if (error) throw error;

      let listings: Listing[] = (closestListings ?? [])
        .map((row: any) => normalizeListing(row))
        .filter((row: Listing | null): row is Listing => row !== null);

      // If vector search is empty, use active listings as a safe UI fallback.
      if (listings.length === 0) {
        listings = await fetchFallbackListings();
      }

      const snippets: string[] = listings.map(
        (l) =>
          `ID: ${l.id} | Title: ${l.title} | Location: ${l.location} | Price: Php ${l.monthly_rent} | Status: ${l.status} | Extras: ${l.subtitle ?? ""} ${l.meta ?? ""}`,
      );

      const llmResponse = await generateChatResponse(text, snippets);
      console.log("Raw LLM Response:", llmResponse);

      // ✅ PRIMARY: extract UUIDs from <uuids> tag
      const tagMatch = llmResponse.match(/<uuids>([\s\S]*?)<\/uuids>/i);
      let recommendedIds: string[];

      if (tagMatch) {
        recommendedIds = (tagMatch[1].match(UUID_REGEX) ?? []).map((id) =>
          id.toLowerCase(),
        );
      } else {
        // ✅ FALLBACK: brute-force scan entire response
        recommendedIds = (llmResponse.match(UUID_REGEX) ?? []).map((id) =>
          id.toLowerCase(),
        );
      }

      recommendedIds = Array.from(new Set(recommendedIds));

      console.log("Extracted IDs:", recommendedIds);

      // Strip XML tags, code blocks, and stray UUIDs from display text
      const cleanText = llmResponse
        .replace(/<uuids>[\s\S]*?<\/uuids>/gi, "")
        .replace(/```xml[\s\S]*?```/gi, "")
        .replace(UUID_REGEX, "")
        .replace(/^,\s*|,\s*$/g, "")
        .trim();

      // Match IDs → listing objects
      const listingsById = new Map(
        listings.map((listing) => [listing.id.toLowerCase(), listing]),
      );

      let suggestedListings: Listing[] =
        recommendedIds.length > 0
          ? recommendedIds
              .map((id) => listingsById.get(id))
              .filter((listing): listing is Listing => Boolean(listing))
          : [];

      // Fallback: LLM gave no IDs → show top 3 from vector search
      if (suggestedListings.length === 0 && listings.length > 0) {
        suggestedListings = listings.slice(0, 3);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, text: cleanText, suggestedListings }
            : msg,
        ),
      );
    } catch (err: unknown) {
      console.error("Chat error:", err);

      const errorMessage = String(
        err instanceof Error ? err.message : String(err),
      );

      if (
        errorMessage.includes("503") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("Too Many Requests")
      ) {
        Alert.alert(
          "High Demand 🐢",
          "There are too many people using Donky right now. Please try again in a few moments!",
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: "Sorry, I ran into an error. Please try again later.",
              }
            : msg,
        ),
      );
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#09090b" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="pt-14 px-5 pb-4 border-b border-zinc-800 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
          >
            <ArrowLeft size={18} color="#e4e4e7" />
          </Pressable>
          <View className="ml-3">
            <Text className="text-zinc-100 text-lg font-semibold">Donky</Text>
            <Text className="text-zinc-500 text-xs">
              Search-to-Chat UI prototype
            </Text>
          </View>
        </View>
        <View className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 flex-row items-center">
          <Sparkles size={14} color="#a5b4fc" />
          <Text className="text-zinc-300 text-xs ml-1">AI</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
      >
        {messages.map((message) => (
          <View key={message.id} className="mb-4">
            {message.role === "user" ? (
              <View className="self-end max-w-[85%] bg-indigo-600 rounded-2xl rounded-br-md px-4 py-3">
                <Text className="text-white">{message.text}</Text>
              </View>
            ) : (
              <View className="w-full">
                {/* Text bubble */}
                {message.text !== "" && (
                  <View className="max-w-[90%] bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 mb-3">
                    <Text className="text-zinc-200 text-sm leading-5">
                      {message.text}
                    </Text>
                  </View>
                )}

                {/* Listing cards */}
                {message.suggestedListings?.map((l) => (
                  <View
                    key={l.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3"
                  >
                    {/* Title + status */}
                    <View className="flex-row items-start justify-between mb-1">
                      <Text
                        className="text-zinc-100 font-semibold text-sm flex-1 mr-2"
                        numberOfLines={2}
                      >
                        {l.title}
                      </Text>
                      <View
                        className={
                          l.status?.toLowerCase() === "available"
                            ? "px-2 py-0.5 rounded-full bg-green-900/40"
                            : "px-2 py-0.5 rounded-full bg-red-900/40"
                        }
                      >
                        <Text
                          className={
                            l.status?.toLowerCase() === "available"
                              ? "text-[10px] font-bold uppercase tracking-wider text-green-400"
                              : "text-[10px] font-bold uppercase tracking-wider text-red-400"
                          }
                        >
                          {l.status}
                        </Text>
                      </View>
                    </View>

                    {/* Location */}
                    <Text
                      className="text-zinc-500 text-xs mb-2"
                      numberOfLines={1}
                    >
                      📍 {l.location}
                    </Text>

                    {/* Description */}
                    {(l.subtitle ?? l.meta) != null && (
                      <Text
                        className="text-zinc-400 text-xs mb-3 leading-4"
                        numberOfLines={2}
                      >
                        {l.subtitle ?? l.meta}
                      </Text>
                    )}

                    {/* Price + CTA */}
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-indigo-400 font-bold text-sm">
                        Php {l.monthly_rent}
                        <Text className="text-zinc-500 text-xs font-normal">
                          {" "}
                          /mo
                        </Text>
                      </Text>
                      <Pressable
                        onPress={() => router.push(`/property/${l.id}`)}
                        className="bg-indigo-600 active:bg-indigo-700 px-4 py-2 rounded-xl"
                      >
                        <Text className="text-white text-xs font-semibold">
                          View Listing →
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Input area */}
      <View className="bg-[#09090b] mb-5 border-t border-zinc-800 px-4 pt-3 pb-6">


        <View className="mt-3 flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Find me a place near BatStateU under 4k"
            placeholderTextColor="#71717a"
            className="flex-1 text-zinc-100 py-3"
            onSubmitEditing={() => sendMessage(draft)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => sendMessage(draft)}
            className="w-9 h-9 rounded-xl bg-indigo-600 items-center justify-center"
          >
            <SendHorizontal size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
