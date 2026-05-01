import { useRouter } from "expo-router";
import {
  CirclePlus,
  Home,
  Package,
  TrendingUp,
} from "lucide-react-native";
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

type OwnerListing = {
  id: string;
  title: string;
  location: string;
  monthlyRent: number;
  status: "draft" | "active" | "archived";
  reviewCount: number;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-600/15", text: "text-emerald-400", label: "Active" },
  draft: { bg: "bg-amber-600/15", text: "text-amber-400", label: "Draft" },
  archived: { bg: "bg-zinc-600/15", text: "text-zinc-400", label: "Archived" },
};

const formatPeso = (amount: number) =>
  `₱${new Intl.NumberFormat("en-PH").format(amount)}`;

export default function DashboardScreen() {
  const { user, isOwner } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = React.useState<OwnerListing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchListings = React.useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        id, title, location, monthly_rent, status,
        listing_reviews ( id )
      `,
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch owner listings:", error);
      return;
    }

    if (data) {
      setListings(
        data.map((d) => ({
          id: d.id,
          title: d.title,
          location: d.location,
          monthlyRent: d.monthly_rent,
          status: d.status,
          reviewCount: d.listing_reviews?.length ?? 0,
        })),
      );
    }
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      await fetchListings();
      if (isMounted) setIsLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [fetchListings]);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await fetchListings();
    setIsRefreshing(false);
  }, [fetchListings]);

  if (!isOwner) {
    return (
      <View
        className="flex-1 bg-[#09090b] items-center justify-center px-6"
        style={{ paddingTop: insets.top }}
      >
        <View className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center mb-5">
          <Home size={28} color="#71717a" />
        </View>
        <Text className="text-zinc-100 text-xl font-bold text-center">
          Landlord Dashboard
        </Text>
        <Text className="text-zinc-400 text-sm text-center mt-2 leading-5 max-w-[300px]">
          This section is reserved for property owners. Contact support to
          register as a landlord.
        </Text>
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

  const activeCount = listings.filter((l) => l.status === "active").length;
  const totalRevenue = listings
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + l.monthlyRent, 0);

  return (
    <View className="flex-1 bg-[#09090b]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-5 pb-4">
        <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
          Dashboard
        </Text>
        <Text className="text-zinc-400 mt-1 text-sm">
          Manage your property listings
        </Text>
      </View>

      {/* Stats row */}
      <View className="px-5 flex-row gap-3 mb-4">
        <View className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
          <View className="flex-row items-center mb-2">
            <Package size={16} color="#818cf8" />
            <Text className="text-zinc-400 text-xs ml-1.5">Active</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">
            {activeCount}
          </Text>
          <Text className="text-zinc-500 text-xs">
            listing{activeCount !== 1 ? "s" : ""}
          </Text>
        </View>

        <View className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
          <View className="flex-row items-center mb-2">
            <TrendingUp size={16} color="#34d399" />
            <Text className="text-zinc-400 text-xs ml-1.5">Potential</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">
            {formatPeso(totalRevenue)}
          </Text>
          <Text className="text-zinc-500 text-xs">monthly income</Text>
        </View>
      </View>

      {/* Listings */}
      <FlatList
        data={listings}
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
          <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 items-center">
            <Home size={32} color="#3f3f46" />
            <Text className="text-zinc-300 font-semibold mt-3">
              No listings yet
            </Text>
            <Text className="text-zinc-500 text-sm mt-1 text-center">
              Create your first property listing to start renting to BatStateU
              students.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
          return (
            <Pressable
              onPress={() => router.push(`/property/${item.id}` as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-zinc-100 text-base font-bold flex-1 mr-2" numberOfLines={1}>
                  {item.title}
                </Text>
                <View className={`px-2.5 py-1 rounded-full ${statusStyle.bg}`}>
                  <Text className={`text-xs font-semibold ${statusStyle.text}`}>
                    {statusStyle.label}
                  </Text>
                </View>
              </View>
              <Text className="text-zinc-400 text-sm mt-1" numberOfLines={1}>
                {item.location}
              </Text>
              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-indigo-300 text-lg font-bold">
                  {formatPeso(item.monthlyRent)}/mo
                </Text>
                <Text className="text-zinc-500 text-xs">
                  {item.reviewCount} review{item.reviewCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Floating add button */}
      <View className="absolute bottom-28 right-5">
        <Pressable
          onPress={() => router.push("/listing/create" as any)}
          className="bg-indigo-600 w-16 h-16 rounded-full items-center justify-center shadow-xl border border-indigo-500/50"
        >
          <CirclePlus color="#fff" size={28} />
        </Pressable>
      </View>
    </View>
  );
}
