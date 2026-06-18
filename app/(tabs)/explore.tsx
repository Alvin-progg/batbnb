import { BookmarkCheck, MapPin } from "lucide-react-native";
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

type SavedListing = {
  listingId: string;
  listing: {
    id: string;
    title: string;
    location: string;
    monthlyRent: number;
    meta: string | null;
  };
};

const formatPeso = (amount: number) =>
  `₱${new Intl.NumberFormat("en-PH").format(amount)}`;

export default function SavedScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [savedListings, setSavedListings] = React.useState<SavedListing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchSaved = React.useCallback(async () => {
    if (!user) {
      setSavedListings([]);
      return;
    }

    const { data, error } = await supabase
      .from("saved_listings")
      .select(
        `
        listing_id,
        listings ( id, title, location, monthly_rent, meta )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch saved listings:", error);
      return;
    }

    if (data) {
      setSavedListings(
        data
          .filter((row: any) => row.listings)
          .map((row: any) => ({
            listingId: row.listing_id,
            listing: {
              id: row.listings.id,
              title: row.listings.title,
              location: row.listings.location,
              monthlyRent: row.listings.monthly_rent,
              meta: row.listings.meta,
            },
          })),
      );
    }
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;

    const load = async () => {
      await fetchSaved();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [fetchSaved]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchSaved();
    setIsRefreshing(false);
  }, [fetchSaved]);

  const removeSaved = React.useCallback(
    async (savedId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("listing_id", savedId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to remove saved listing:", error);
        return;
      }

      setSavedListings((prev) =>
        prev.filter((listing) => listing.listingId !== savedId),
      );
    },
    [user],
  );

  if (!user) {
    return (
      <View
        className="flex-1 bg-[#09090b] items-center justify-center px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-zinc-400">Log in to view saved listings.</Text>
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
      <View className="px-5 pt-5 pb-4">
        <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
          Saved
        </Text>
        <Text className="text-zinc-400 mt-1 text-sm">
          Your bookmarked apartments.
        </Text>
      </View>

      <FlatList
        data={savedListings}
        keyExtractor={(item) => item.listingId}
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
            <BookmarkCheck size={28} color="#818cf8" />
            <Text className="text-zinc-300 font-semibold mt-3">
              No saved listings yet
            </Text>
            <Text className="text-zinc-500 text-sm mt-1 text-center">
              Tap the bookmark icon on listings to save them here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-zinc-100 text-base font-semibold flex-1 mr-2"
                numberOfLines={1}
              >
                {item.listing.title}
              </Text>
              <Pressable
                onPress={() => removeSaved(item.listingId)}
                className="p-2 rounded-full bg-zinc-900 border border-zinc-800"
              >
                <BookmarkCheck size={16} color="#818cf8" />
              </Pressable>
            </View>
            <View className="flex-row items-center mt-2">
              <MapPin size={14} color="#a1a1aa" />
              <Text className="text-zinc-400 text-xs ml-1" numberOfLines={1}>
                {item.listing.location}
              </Text>
            </View>
            {item.listing.meta ? (
              <Text className="text-zinc-500 text-xs mt-1" numberOfLines={1}>
                {item.listing.meta}
              </Text>
            ) : null}
            <Text className="text-indigo-300 text-base font-bold mt-3">
              {formatPeso(item.listing.monthlyRent)}/mo
            </Text>
          </View>
        )}
      />
    </View>
  );
}
