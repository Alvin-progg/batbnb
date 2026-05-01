import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, SendHorizontal } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string | null;
  message: string;
  role: "renter" | "owner" | "system";
  created_at: string;
};

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [threadInfo, setThreadInfo] = React.useState<{ owner_id: string; renter_id: string } | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      // Fetch thread info first to know roles
      const { data: threadData } = await supabase
        .from("chat_threads")
        .select("owner_id, renter_id")
        .eq("id", id)
        .single();
        
      if (isMounted && threadData) {
        setThreadInfo(threadData);
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
      } else if (isMounted && data) {
        setMessages(data as ChatMessage[]);
      }
      if (isMounted) setIsLoading(false);
    }

    loadMessages();

    // Subscribe to new messages using Supabase Realtime
    const channel = supabase
      .channel(`chat_thread_${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${id}`,
        },
        (payload) => {
          if (isMounted) {
            setMessages((prev) => {
              // Prevent duplicates if we added it optimistically
              const exists = prev.some(m => m.id === (payload.new as ChatMessage).id);
              if (exists) return prev;
              return [...prev, payload.new as ChatMessage];
            });
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSend = React.useCallback(async () => {
    if (!draft.trim() || !user || !threadInfo) return;

    const messageText = draft.trim();
    const role = user.id === threadInfo.owner_id ? "owner" : "renter";
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic Update
    const newMessage: ChatMessage = {
      id: tempId,
      thread_id: id,
      sender_id: user.id,
      message: messageText,
      role: role,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setDraft("");
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    const { data, error } = await supabase.from("chat_messages").insert({
      thread_id: id,
      sender_id: user.id,
      message: messageText,
      role: role,
    }).select().single();

    if (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      setDraft(messageText);
    } else if (data) {
      // Replace optimistic message with real one to get real ID
      setMessages((prev) => prev.map(m => m.id === tempId ? (data as ChatMessage) : m));
    }
  }, [draft, id, user, threadInfo]);

  if (!user) {
    return (
      <View className="flex-1 bg-[#09090b] items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-zinc-400">Please log in to view this chat.</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-zinc-800 px-4 py-2 rounded-full"
        >
          <Text className="text-zinc-100">Go Back</Text>
        </Pressable>
      </View>
    );
  }

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
            <Text className="text-zinc-100 text-lg font-semibold">Chat</Text>
          </View>
        </View>
      </View>

      {/* Messages Area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#a5b4fc" />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message) => {
            const isMe = message.sender_id === user.id;

            if (message.role === "system") {
              return (
                <View key={message.id} className="items-center my-2">
                  <Text className="text-zinc-500 text-xs">{message.message}</Text>
                </View>
              );
            }

            return (
              <View
                key={message.id}
                className={`mb-3 max-w-[85%] ${
                  isMe ? "self-end" : "self-start"
                }`}
              >
                <View
                  className={`px-4 py-3 rounded-2xl ${
                    isMe
                      ? "bg-indigo-600 rounded-br-md"
                      : "bg-zinc-900 border border-zinc-800 rounded-bl-md"
                  }`}
                >
                  <Text className={isMe ? "text-white" : "text-zinc-200"}>
                    {message.message}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Input Area */}
      <View className="bg-[#09090b] mb-5 px-4 pt-3 pb-6">
        <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#71717a"
            className="flex-1 text-zinc-100 py-3"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim()}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              draft.trim() ? "bg-indigo-600" : "bg-zinc-800"
            }`}
          >
            <SendHorizontal
              size={16}
              color={draft.trim() ? "#ffffff" : "#71717a"}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
