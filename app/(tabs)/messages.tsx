import { useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

type ChatThread = {
  id: string;
  listing_id: string;
  listing: { title: string; location: string };
  other_user: { display_name: string; avatar_url: string | null };
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchThreads = React.useCallback(async () => {
    if (!user) return;

    // We fetch threads where the user is either the renter or the owner
    const { data, error } = await supabase
      .from("chat_threads")
      .select(`
        id,
        listing_id,
        owner_id,
        renter_id,
        listings ( title, location ),
        owner:users!chat_threads_owner_id_fkey ( display_name, avatar_url ),
        renter:users!chat_threads_renter_id_fkey ( display_name, avatar_url )
      `)
      .or(`owner_id.eq.${user.id},renter_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching threads:", error);
      return;
    }

    if (data) {
      const formatted = data.map((d: any) => {
        const isOwner = d.owner_id === user.id;
        return {
          id: d.id,
          listing_id: d.listing_id,
          listing: {
            title: d.listings?.title ?? "Unknown Listing",
            location: d.listings?.location ?? "Unknown Location",
          },
          other_user: isOwner
            ? { display_name: d.renter?.display_name ?? "Student", avatar_url: d.renter?.avatar_url }
            : { display_name: d.owner?.display_name ?? "Landlord", avatar_url: d.owner?.avatar_url },
        };
      });
      setThreads(formatted);
    }
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      await fetchThreads();
      if (isMounted) setIsLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [fetchThreads]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchThreads();
    setIsRefreshing(false);
  }, [fetchThreads]);

  if (!user) {
    return (
      <View
        className="flex-1 bg-[#09090b] items-center justify-center px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-zinc-400">Please log in to view messages.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#09090b] items-center justify-center">
        <ActivityIndicator size="small" color="#a5b4fc" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#09090b]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-5 pb-4">
        <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
          Messages
        </Text>
        <Text className="text-zinc-400 mt-1 text-sm">
          Chat with landlords and students
        </Text>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#a5b4fc"
          />
        }
        ListEmptyComponent={
          <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 items-center mt-4">
            <MessageCircle size={32} color="#3f3f46" />
            <Text className="text-zinc-300 font-semibold mt-3">
              No messages yet
            </Text>
            <Text className="text-zinc-500 text-sm mt-1 text-center">
              Reach out to landlords from property listings, and your chats will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}` as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-3 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full bg-indigo-600/20 items-center justify-center mr-4">
              <MessageCircle size={20} color="#818cf8" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-100 font-semibold text-base mb-0.5">
                {item.other_user.display_name}
              </Text>
              <Text className="text-zinc-400 text-sm" numberOfLines={1}>
                {item.listing.title}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
