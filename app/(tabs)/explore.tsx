import { BookmarkCheck, MessageSquareText, Wifi } from "lucide-react-native";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useAuth } from "@/providers/auth-provider";

export default function SavedScreen() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = React.useCallback(async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      Alert.alert("Sign out failed", error);
    }
    setIsSigningOut(false);
  }, [signOut]);

  return (
    <View className="flex-1 bg-[#09090b] px-5 pt-20">
      <View className="border border-zinc-800 rounded-3xl bg-zinc-950/80 p-5">
        <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
          Saved Places
        </Text>
        <Text className="text-zinc-400 mt-2 text-base leading-6">
          Bookmark apartments, then compare rent, internet stability, and owner
          reliability.
        </Text>
      </View>

      <View className="mt-6 gap-4">
        <View className="flex-row items-center gap-3 border border-zinc-800 rounded-2xl p-4 bg-zinc-950">
          <BookmarkCheck color="#818cf8" size={20} />
          <Text className="text-zinc-200 text-sm">No saved listings yet.</Text>
        </View>
        <View className="flex-row items-center gap-3 border border-zinc-800 rounded-2xl p-4 bg-zinc-950">
          <Wifi color="#22d3ee" size={20} />
          <Text className="text-zinc-200 text-sm">
            Track internet speed reports from students.
          </Text>
        </View>
        <View className="flex-row items-center gap-3 border border-zinc-800 rounded-2xl p-4 bg-zinc-950">
          <MessageSquareText color="#34d399" size={20} />
          <Text className="text-zinc-200 text-sm">
            Chat with renters when a listing opens.
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          className={`rounded-2xl p-4 items-center ${
            isSigningOut ? "bg-zinc-800" : "bg-zinc-700"
          }`}
        >
          <Text className="text-zinc-100 text-sm font-semibold">
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
