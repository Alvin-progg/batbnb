import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

export default function AccountScreen() {
  const { user, isOwner, refreshOwnerStatus, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const handleSignOut = React.useCallback(async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      Alert.alert("Sign out failed", error);
    }
    setIsSigningOut(false);
  }, [signOut]);

  const handleApply = React.useCallback(async () => {
    if (!user) return;

    setIsApplying(true);
    const { error } = await supabase
      .from("users")
      .update({ is_owner: true })
      .eq("id", user.id);

    if (error) {
      Alert.alert("Application failed", error.message ?? "Try again later.");
      setIsApplying(false);
      return;
    }

    await refreshOwnerStatus();
    setIsApplying(false);
    Alert.alert("Application sent", "You now have landlord access.");
  }, [refreshOwnerStatus, user]);

  return (
    <View className="flex-1 bg-[#09090b]" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-5 pb-4">
        <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
          Account
        </Text>
        <Text className="text-zinc-400 mt-1 text-sm">
          Manage your session and profile.
        </Text>
      </View>

      <View className="px-5">
        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
          <Text className="text-zinc-400 text-xs uppercase tracking-wide">
            Signed in as
          </Text>
          <Text className="text-zinc-100 text-base font-semibold mt-2">
            {user?.email ?? "Unknown user"}
          </Text>
        </View>

        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-4">
          <Text className="text-zinc-400 text-xs uppercase tracking-wide">
            Landlord access
          </Text>
          <Text className="text-zinc-100 text-base font-semibold mt-2">
            {isOwner ? "Active" : "Not enrolled"}
          </Text>
          {!isOwner ? (
            <Pressable
              onPress={handleApply}
              disabled={isApplying}
              className={`mt-3 rounded-xl p-3 items-center ${
                isApplying ? "bg-zinc-800" : "bg-indigo-600"
              }`}
            >
              <Text className="text-white text-sm font-semibold">
                {isApplying ? "Applying..." : "Apply to be a landlord"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          className={`mt-4 rounded-2xl p-4 items-center ${
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
