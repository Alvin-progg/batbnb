import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, SendHorizontal, Sparkles } from "lucide-react-native";
import React from "react";
import {
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
type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
};

const QUICK_REPLIES = [
  "Check availability",
  "View on map",
  "Near Batangas State U",
  "Show under 4,500",
];

function createInitialMessages(listing?: string): ChatMessage[] {
  const intro = listing
    ? `I can help with ${listing}. Ask for availability, commute time, or student reviews.`
    : "Tell me your budget and preferred area in Batangas, and I will suggest student-friendly options.";

  return [
    {
      id: 1,
      role: "bot",
      text: "Hi, I am Donky.",
    },
    {
      id: 2,
      role: "bot",
      text: intro,
    },
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

    // Optimistically add user msg & bot loading state
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text },
      { id: botMessageId, role: "bot", text: "Thinking..." },
    ]);
    setDraft("");

    try {
      // 1. Get embedding for the user's prompt
      const queryEmbedding = await getEmbedding(text);

      // 2. Call the Supabase RPC to match against listings
      const { data: closestListings, error } = await supabase.rpc(
        "match_listings",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // Adjust to how strict you want matches
          match_count: 3, // Top 3 results
        },
      );

      if (error) {
        console.error("Match listings error:", error);
        throw error;
      }

      // 3. Format the context for Gemini
      let snippetText = "No direct listings found, just chat generally.";
      let snippets: string[] = [];
      if (closestListings && closestListings.length > 0) {
        snippets = closestListings.map(
          (l: any) =>
            `${l.title} at ${l.location} for Php ${l.monthly_rent}. Extras: ${l.subtitle} ${l.meta}`,
        );
        snippetText = snippets.join("\n\n");
      }

      // 4. Send to Gemini
      const geminiResponse = await generateChatResponse(text, snippets);

      setMessages((current) =>
        current.map((msg) =>
          msg.id === botMessageId ? { ...msg, text: geminiResponse } : msg,
        ),
      );
    } catch (err: any) {
      console.error("Chat error:", err);

      const errorMessage = String(err?.message || err);
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

      setMessages((current) =>
        current.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: "Sorry, I ran into an error connecting to my brain. Please try again later.",
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
      // If your tab bar is absolutely positioned, add its height here:
      // keyboardVerticalOffset={56}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — unchanged */}
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
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            className={
              message.role === "user"
                ? "self-end max-w-[85%] bg-indigo-600 rounded-2xl rounded-br-md px-4 py-3 mb-3"
                : "self-start max-w-[90%] bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 mb-3"
            }
          >
            <Text
              className={
                message.role === "user" ? "text-white" : "text-zinc-200"
              }
            >
              {message.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* ✅ Input bar — NO longer absolute */}
      <View className="bg-[#09090b] mb-5 border-t border-zinc-800 px-4 pt-3 pb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_REPLIES.map((reply) => (
            <Pressable
              key={reply}
              onPress={() => sendMessage(reply)}
              className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 mr-2"
            >
              <Text className="text-zinc-300 text-xs">{reply}</Text>
            </Pressable>
          ))}
        </ScrollView>

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
