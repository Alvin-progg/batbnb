import { useRouter } from "expo-router";
import {
  Check,
  CirclePlus,
  Home,
  Package,
  Pencil,
  TrendingUp,
  X,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";
import { useAuth } from "@/providers/auth-provider";

type OwnerListing = {
  id: string;
  title: string;
  location: string;
  monthlyRent: number;
  status: "draft" | "active" | "paused" | "archived";
  reviewCount: number;
  savesCount: number;
  messageCount: number;
  inquiryCount: number;
};

type StatusFilter = "all" | OwnerListing["status"];

type StatusOption = {
  value: OwnerListing["status"];
  label: string;
};

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "bg-emerald-600/15",
    text: "text-emerald-400",
    label: "Active",
  },
  paused: { bg: "bg-amber-500/15", text: "text-amber-300", label: "Paused" },
  draft: { bg: "bg-amber-600/15", text: "text-amber-400", label: "Draft" },
  archived: { bg: "bg-zinc-600/15", text: "text-zinc-400", label: "Archived" },
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
  { value: "draft", label: "Draft" },
];

const formatPeso = (amount: number) =>
  `₱${new Intl.NumberFormat("en-PH").format(amount)}`;

export default function DashboardScreen() {
  const { user, isOwner } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = React.useState<OwnerListing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftRent, setDraftRent] = React.useState("");
  const [newInquiries, setNewInquiries] = React.useState(0);

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

    if (!data) {
      return;
    }

    const listingIds = data.map((d) => d.id);
    const savesCountByListing = new Map<string, number>();
    const inquiryCountByListing = new Map<string, number>();
    const messageCountByListing = new Map<string, number>();

    const weekAgoIso = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    let newInquiryCount = 0;

    if (listingIds.length > 0) {
      const [savedResult, threadsResult] = await Promise.all([
        supabase
          .from("saved_listings")
          .select("listing_id")
          .in("listing_id", listingIds),
        supabase
          .from("chat_threads")
          .select("id, listing_id, created_at")
          .eq("owner_id", user.id)
          .in("listing_id", listingIds),
      ]);

      if (savedResult.error) {
        console.error("Failed to fetch saves:", savedResult.error);
      }

      if (savedResult.data) {
        savedResult.data.forEach((row) => {
          savesCountByListing.set(
            row.listing_id,
            (savesCountByListing.get(row.listing_id) ?? 0) + 1,
          );
        });
      }

      if (threadsResult.error) {
        console.error("Failed to fetch inquiries:", threadsResult.error);
      }

      const threads = threadsResult.data ?? [];
      const threadIdToListing = new Map<string, string>();
      const threadIds: string[] = [];

      threads.forEach((thread) => {
        threadIdToListing.set(thread.id, thread.listing_id);
        threadIds.push(thread.id);
        inquiryCountByListing.set(
          thread.listing_id,
          (inquiryCountByListing.get(thread.listing_id) ?? 0) + 1,
        );
        if (thread.created_at >= weekAgoIso) {
          newInquiryCount += 1;
        }
      });

      if (threadIds.length > 0) {
        const messagesResult = await supabase
          .from("chat_messages")
          .select("id, thread_id")
          .in("thread_id", threadIds);

        if (messagesResult.error) {
          console.error("Failed to fetch messages:", messagesResult.error);
        }

        if (messagesResult.data) {
          messagesResult.data.forEach((message) => {
            const listingId = threadIdToListing.get(message.thread_id);
            if (!listingId) return;
            messageCountByListing.set(
              listingId,
              (messageCountByListing.get(listingId) ?? 0) + 1,
            );
          });
        }
      }
    }

    setNewInquiries(newInquiryCount);

    setListings(
      data.map((d) => ({
        id: d.id,
        title: d.title,
        location: d.location,
        monthlyRent: d.monthly_rent,
        status: d.status as OwnerListing["status"],
        reviewCount: d.listing_reviews?.length ?? 0,
        savesCount: savesCountByListing.get(d.id) ?? 0,
        messageCount: messageCountByListing.get(d.id) ?? 0,
        inquiryCount: inquiryCountByListing.get(d.id) ?? 0,
      })),
    );
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredListings = React.useMemo(() => {
    return listings.filter((listing) => {
      const matchesStatus =
        statusFilter === "all" || listing.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        listing.title.toLowerCase().includes(normalizedQuery) ||
        listing.location.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [listings, normalizedQuery, statusFilter]);

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelection = React.useCallback(() => {
    setIsSelecting(false);
    clearSelection();
  }, [clearSelection]);

  const parseRent = React.useCallback((rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^0-9]/g, "");
    if (!digitsOnly) return 0;
    return Number(digitsOnly);
  }, []);

  const beginEdit = React.useCallback((listing: OwnerListing) => {
    setEditingId(listing.id);
    setDraftTitle(listing.title);
    setDraftRent(listing.monthlyRent.toString());
  }, []);

  const cancelEdit = React.useCallback(() => {
    setEditingId(null);
    setDraftTitle("");
    setDraftRent("");
  }, []);

  const saveEdit = React.useCallback(
    async (listingId: string) => {
      const nextRent = parseRent(draftRent);
      const nextTitle = draftTitle.trim();
      if (!nextTitle || nextRent <= 0) {
        return;
      }

      const { error } = await supabase
        .from("listings")
        .update({ title: nextTitle, monthly_rent: nextRent })
        .eq("id", listingId);

      if (error) {
        console.error("Failed to update listing:", error);
        return;
      }

      setListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId
            ? { ...listing, title: nextTitle, monthlyRent: nextRent }
            : listing,
        ),
      );

      cancelEdit();
    },
    [cancelEdit, draftRent, draftTitle, parseRent],
  );

  const updateListingStatus = React.useCallback(
    async (ids: string[], status: OwnerListing["status"]) => {
      if (ids.length === 0) return;

      const { error } = await supabase
        .from("listings")
        .update({
          status: status as Database["public"]["Enums"]["listing_status"],
        })
        .in("id", ids);

      if (error) {
        console.error("Failed to update listing status:", error);
        return;
      }

      setListings((prev) =>
        prev.map((listing) =>
          ids.includes(listing.id) ? { ...listing, status } : listing,
        ),
      );
    },
    [],
  );

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

  const totalCount = listings.length;
  const activeCount = listings.filter((l) => l.status === "active").length;
  const pausedCount = listings.filter((l) => l.status === "paused").length;
  const avgRent = listings.length
    ? Math.round(
        listings.reduce((sum, listing) => sum + listing.monthlyRent, 0) /
          listings.length,
      )
    : 0;
  const hasSelection = selectedIds.size > 0;

  return (
    <View className="flex-1 bg-[#09090b]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-5 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
              Dashboard
            </Text>
            <Text className="text-zinc-400 mt-1 text-sm">
              Manage your property listings
            </Text>
          </View>
          <Pressable
            onPress={() =>
              isSelecting ? exitSelection() : setIsSelecting(true)
            }
            className="px-3 py-2 rounded-full border border-zinc-800 bg-zinc-950"
          >
            <Text className="text-zinc-200 text-xs font-semibold">
              {isSelecting ? "Done" : "Select"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Stats row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
      >
        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mr-3 w-40 h-24 justify-between overflow-hidden">
          <View className="flex-row items-center">
            <Package size={16} color="#818cf8" />
            <Text className="text-zinc-400 text-xs ml-1.5">Total</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">{totalCount}</Text>
          <Text className="text-zinc-500 text-xs" numberOfLines={1}>
            listing(s)
          </Text>
        </View>

        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mr-3 w-40 h-24 justify-between overflow-hidden">
          <View className="flex-row items-center">
            <Package size={16} color="#34d399" />
            <Text className="text-zinc-400 text-xs ml-1.5">Active</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">
            {activeCount}
          </Text>
          <Text className="text-zinc-500 text-xs" numberOfLines={1}>
            live now
          </Text>
        </View>

        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mr-3 w-40 h-24 justify-between overflow-hidden">
          <View className="flex-row items-center">
            <Package size={16} color="#fbbf24" />
            <Text className="text-zinc-400 text-xs ml-1.5">Paused</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">
            {pausedCount}
          </Text>
          <Text className="text-zinc-500 text-xs" numberOfLines={1}>
            on hold
          </Text>
        </View>

        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mr-3 w-44 h-24 justify-between overflow-hidden">
          <View className="flex-row items-center">
            <TrendingUp size={16} color="#34d399" />
            <Text className="text-zinc-400 text-xs ml-1.5">Avg rent</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">
            {formatPeso(avgRent)}
          </Text>
          <Text className="text-zinc-500 text-xs" numberOfLines={1}>
            per listing
          </Text>
        </View>

        <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 w-44 h-24 justify-between overflow-hidden">
          <View className="flex-row items-center">
            <TrendingUp size={16} color="#a5b4fc" />
            <Text className="text-zinc-400 text-xs ml-1.5">New inquiries</Text>
          </View>
          <Text className="text-zinc-100 text-2xl font-bold">
            {newInquiries}
          </Text>
          <Text className="text-zinc-500 text-xs" numberOfLines={1}>
            last 7 days
          </Text>
        </View>
      </ScrollView>

      {/* Listings */}
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-3 mt-2 bg-[#09090b]">
            <View className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search listings or locations"
                placeholderTextColor="#71717a"
                className="text-zinc-100 text-sm"
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
            >
              {["all", ...STATUS_OPTIONS.map((option) => option.value)].map(
                (status) => {
                  const isActive = statusFilter === status;
                  const label =
                    status === "all"
                      ? "All"
                      : (STATUS_COLORS[status]?.label ?? status);
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setStatusFilter(status as StatusFilter)}
                      className={`mr-2 rounded-full border px-3 py-1.5 ${
                        isActive
                          ? "border-indigo-500 bg-indigo-500/15"
                          : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isActive ? "text-indigo-300" : "text-zinc-300"
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </ScrollView>
            {isSelecting ? (
              <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 mt-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-zinc-200 text-sm font-semibold">
                    {selectedIds.size} selected
                  </Text>
                  <Pressable onPress={clearSelection}>
                    <Text className="text-zinc-400 text-xs">Clear</Text>
                  </Pressable>
                </View>
                <View className="flex-row items-center mt-3">
                  <Pressable
                    onPress={async () => {
                      await updateListingStatus(
                        Array.from(selectedIds),
                        "active",
                      );
                      clearSelection();
                    }}
                    className="mr-2 px-3 py-2 rounded-full bg-emerald-600/20 border border-emerald-600/40"
                  >
                    <Text className="text-emerald-300 text-xs font-semibold">
                      Active
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      await updateListingStatus(
                        Array.from(selectedIds),
                        "paused",
                      );
                      clearSelection();
                    }}
                    className="mr-2 px-3 py-2 rounded-full bg-amber-500/20 border border-amber-500/40"
                  >
                    <Text className="text-amber-300 text-xs font-semibold">
                      Paused
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      await updateListingStatus(
                        Array.from(selectedIds),
                        "archived",
                      );
                      clearSelection();
                    }}
                    className="px-3 py-2 rounded-full bg-zinc-700/30 border border-zinc-600"
                  >
                    <Text className="text-zinc-200 text-xs font-semibold">
                      Archive
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        }
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
          const isEditing = editingId === item.id;
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              onPress={() =>
                isSelecting
                  ? toggleSelection(item.id)
                  : isEditing
                    ? undefined
                    : router.push(`/property/${item.id}` as any)
              }
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  {isSelecting ? (
                    <Pressable
                      onPress={() => toggleSelection(item.id)}
                      className={`w-5 h-5 rounded-md border mr-2 items-center justify-center ${
                        isSelected
                          ? "border-indigo-400 bg-indigo-500/30"
                          : "border-zinc-700"
                      }`}
                    >
                      {isSelected ? <Check size={12} color="#c7d2fe" /> : null}
                    </Pressable>
                  ) : null}
                  {isEditing ? (
                    <TextInput
                      value={draftTitle}
                      onChangeText={setDraftTitle}
                      className="text-zinc-100 text-base font-bold flex-1"
                      placeholder="Listing title"
                      placeholderTextColor="#71717a"
                    />
                  ) : (
                    <Text
                      className="text-zinc-100 text-base font-bold flex-1"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  )}
                </View>
                {isEditing ? (
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => saveEdit(item.id)}
                      className="mr-2 px-2.5 py-1 rounded-full bg-emerald-600/20 border border-emerald-600/40"
                    >
                      <Check size={14} color="#6ee7b7" />
                    </Pressable>
                    <Pressable
                      onPress={cancelEdit}
                      className="px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700"
                    >
                      <X size={14} color="#a1a1aa" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => beginEdit(item)}
                    className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800"
                  >
                    <Pencil size={14} color="#a1a1aa" />
                  </Pressable>
                )}
              </View>

              <Text className="text-zinc-400 text-sm mt-1" numberOfLines={1}>
                {item.location}
              </Text>

              <View className="flex-row items-center justify-between mt-3">
                {isEditing ? (
                  <View className="flex-row items-center">
                    <TextInput
                      value={draftRent}
                      onChangeText={setDraftRent}
                      keyboardType="number-pad"
                      className="text-indigo-300 text-lg font-bold"
                      placeholder="Rent"
                      placeholderTextColor="#6366f1"
                    />
                    <Text className="text-indigo-300 text-sm ml-1">/mo</Text>
                  </View>
                ) : (
                  <Text className="text-indigo-300 text-lg font-bold">
                    {formatPeso(item.monthlyRent)}/mo
                  </Text>
                )}
                <Text className="text-zinc-500 text-xs">
                  {item.reviewCount} review{item.reviewCount !== 1 ? "s" : ""}
                </Text>
              </View>

              <View className="flex-row flex-wrap items-center mt-3">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = item.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        updateListingStatus([item.id], option.value)
                      }
                      className={`mr-2 mb-2 rounded-full border px-3 py-1 ${
                        isActive
                          ? statusStyle.bg + " border-transparent"
                          : "border-zinc-800"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isActive ? statusStyle.text : "text-zinc-400"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center">
                  <Text className="text-zinc-500 text-xs mr-3">
                    {item.savesCount} saves
                  </Text>
                  <Text className="text-zinc-500 text-xs mr-3">
                    {item.inquiryCount} inquiries
                  </Text>
                  <Text className="text-zinc-500 text-xs">
                    {item.messageCount} messages
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${statusStyle.bg}`}>
                  <Text className={`text-xs font-semibold ${statusStyle.text}`}>
                    {statusStyle.label}
                  </Text>
                </View>
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
