import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import {
    BedDouble,
    Bot,
    ChevronDown,
    ChevronUp,
    Search,
    SlidersHorizontal,
} from "lucide-react-native";
import React from "react";
import {
    Animated,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

type Listing = {
  id: string;
  title: string;
  monthlyRent: number;
  latitude: number;
  longitude: number;
  meta: string;
};

type BudgetFilter = {
  min?: number;
  max?: number;
};

type PersistedFilters = {
  searchQuery: string;
  min?: number;
  max?: number;
};

const FILTERS_STORAGE_KEY = "batbnb:discovery-filters:v1";
const DRAWER_COLLAPSED_HEIGHT = 112;

const formatPriceTag = (amount: number) => {
  const compact = amount / 1000;
  const decimals = Number.isInteger(compact) ? 0 : 1;
  return `₱${compact.toFixed(decimals)}k`;
};

const formatPeso = (amount: number) =>
  `₱${new Intl.NumberFormat("en-PH").format(amount)}`;

function parseBudget(rawValue: string): number | undefined {
  const digitsOnly = rawValue.replace(/[^0-9]/g, "");
  if (!digitsOnly) {
    return undefined;
  }
  return Number(digitsOnly);
}

export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isFilterModalVisible, setFilterModalVisible] = React.useState(false);
  const [minBudgetInput, setMinBudgetInput] = React.useState("");
  const [maxBudgetInput, setMaxBudgetInput] = React.useState("");
  const [budgetFilter, setBudgetFilter] = React.useState<BudgetFilter>({});
  const [filterError, setFilterError] = React.useState<string | null>(null);
  const [hasLoadedPersistedFilters, setHasLoadedPersistedFilters] =
    React.useState(false);
  const [isDrawerExpanded, setDrawerExpanded] = React.useState(false);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const drawerProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let isMounted = true;

    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, monthly_rent, latitude, longitude, meta")
        .eq("status", "active");

      if (error) {
        console.error("Failed to load listings:", error);
        return;
      }

      if (data && isMounted) {
        setListings(
          data.map((d) => ({
            id: d.id,
            title: d.title,
            monthlyRent: d.monthly_rent,
            latitude: d.latitude,
            longitude: d.longitude,
            meta: d.meta || "",
          })),
        );
      }
    }

    fetchListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const drawerExpandedHeight = Math.min(
    420,
    Math.max(280, Math.round(windowHeight * 0.5)),
  );
  const drawerBottom = tabBarHeight + 8;

  const hasActiveBudgetFilter =
    budgetFilter.min !== undefined || budgetFilter.max !== undefined;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredListings = React.useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        listing.title.toLowerCase().includes(normalizedSearchQuery) ||
        listing.meta.toLowerCase().includes(normalizedSearchQuery);
      const matchesMinBudget =
        budgetFilter.min === undefined ||
        listing.monthlyRent >= budgetFilter.min;
      const matchesMaxBudget =
        budgetFilter.max === undefined ||
        listing.monthlyRent <= budgetFilter.max;

      return matchesSearch && matchesMinBudget && matchesMaxBudget;
    });
  }, [budgetFilter.max, budgetFilter.min, normalizedSearchQuery]);

  React.useEffect(() => {
    let isMounted = true;

    const loadPersistedFilters = async () => {
      try {
        const rawFilters = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (!rawFilters) {
          return;
        }

        const parsed = JSON.parse(rawFilters) as PersistedFilters;
        const restoredMin =
          typeof parsed.min === "number" ? parsed.min : undefined;
        const restoredMax =
          typeof parsed.max === "number" ? parsed.max : undefined;

        if (typeof parsed.searchQuery === "string") {
          setSearchQuery(parsed.searchQuery);
        }

        setBudgetFilter({ min: restoredMin, max: restoredMax });
      } catch {
        // Ignore malformed persisted data and continue with defaults.
      } finally {
        if (isMounted) {
          setHasLoadedPersistedFilters(true);
        }
      }
    };

    loadPersistedFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hasLoadedPersistedFilters) {
      return;
    }

    const persistFilters = async () => {
      const payload: PersistedFilters = {
        searchQuery,
        min: budgetFilter.min,
        max: budgetFilter.max,
      };
      try {
        await AsyncStorage.setItem(
          FILTERS_STORAGE_KEY,
          JSON.stringify(payload),
        );
      } catch {
        // Ignore storage write failures to keep UI responsive.
      }
    };

    persistFilters();
  }, [
    budgetFilter.max,
    budgetFilter.min,
    hasLoadedPersistedFilters,
    searchQuery,
  ]);

  React.useEffect(() => {
    Animated.spring(drawerProgress, {
      toValue: isDrawerExpanded ? 1 : 0,
      bounciness: 0,
      speed: 16,
      useNativeDriver: false,
    }).start();
  }, [drawerProgress, isDrawerExpanded]);

  const drawerHeight = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_COLLAPSED_HEIGHT, drawerExpandedHeight],
  });

  const drawerBodyOpacity = drawerProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.15, 1],
  });

  const drawerBodyTranslateY = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  const chatButtonBottom =
    drawerBottom +
    (isDrawerExpanded
      ? drawerExpandedHeight + 14
      : DRAWER_COLLAPSED_HEIGHT + 14);

  const filterSummary = `${
    budgetFilter.min !== undefined ? formatPeso(budgetFilter.min) : "Any"
  } - ${budgetFilter.max !== undefined ? formatPeso(budgetFilter.max) : "Any"}`;

  const clearBudgetFilter = React.useCallback(() => {
    setBudgetFilter({});
    setMinBudgetInput("");
    setMaxBudgetInput("");
    setFilterError(null);
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setSearchQuery("");
    clearBudgetFilter();
  }, [clearBudgetFilter]);

  const openFilterModal = React.useCallback(() => {
    setMinBudgetInput(budgetFilter.min?.toString() ?? "");
    setMaxBudgetInput(budgetFilter.max?.toString() ?? "");
    setFilterError(null);
    setFilterModalVisible(true);
  }, [budgetFilter.max, budgetFilter.min]);

  const applyBudgetFilter = React.useCallback(() => {
    const parsedMin = parseBudget(minBudgetInput);
    const parsedMax = parseBudget(maxBudgetInput);

    if (
      parsedMin !== undefined &&
      parsedMax !== undefined &&
      parsedMin > parsedMax
    ) {
      setFilterError("Minimum budget cannot be higher than maximum budget.");
      return;
    }

    setBudgetFilter({ min: parsedMin, max: parsedMax });
    setMinBudgetInput(parsedMin?.toString() ?? "");
    setMaxBudgetInput(parsedMax?.toString() ?? "");
    setFilterError(null);
    setDrawerExpanded(true);
    setFilterModalVisible(false);
  }, [maxBudgetInput, minBudgetInput]);

  const headingText =
    filteredListings.length === listings.length &&
    normalizedSearchQuery.length === 0 &&
    !hasActiveBudgetFilter
      ? "Recommended near Batangas State U"
      : `${filteredListings.length} apartment${
          filteredListings.length === 1 ? "" : "s"
        } match your filters`;

  const drawerHelperText = hasActiveBudgetFilter
    ? `Budget: ${filterSummary}`
    : "Tap to expand results";

  return (
    <View className="flex-1 bg-[#09090b]">
      <MapView
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        userInterfaceStyle="dark"
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: 13.7565,
          longitude: 121.0583,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {filteredListings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
            onPress={() => router.push(`/property/${listing.id}` as any)}
          >
            <View className="items-center">
              <View className="bg-zinc-950 border border-zinc-700 px-3 py-1.5 rounded-xl shadow-md">
                <Text className="text-zinc-100 font-bold text-sm tracking-tight">
                  {formatPriceTag(listing.monthlyRent)}
                </Text>
              </View>
              <View
                style={{
                  width: 0,
                  height: 0,
                  backgroundColor: "transparent",
                  borderStyle: "solid",
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 6,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderTopColor: "#3f3f46", // Matches border-zinc-700 to look like a connected pin
                }}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View className="absolute w-full px-4" style={{ top: insets.top + 16 }}>
        <View className="flex-row items-center bg-[#09090b]/85 border border-zinc-800 rounded-full px-4 py-3.5 shadow-lg overflow-hidden">
          <Search color="#a1a1aa" size={20} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Near Batangas State U, under 4k"
            placeholderTextColor="#71717a"
            className="flex-1 text-zinc-100 ml-3 text-base leading-tight font-medium"
          />
          <Pressable
            onPress={openFilterModal}
            className="bg-zinc-800 p-2 rounded-full ml-2"
          >
            <SlidersHorizontal color="#e4e4e7" size={16} />
          </Pressable>
        </View>

        {hasActiveBudgetFilter ? (
          <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-2.5">
            <Text className="text-zinc-300 text-xs font-medium">
              Budget: {filterSummary}
            </Text>
            <Pressable onPress={clearBudgetFilter}>
              <Text className="text-indigo-300 text-xs font-semibold">
                Clear
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Animated.View
        className="absolute left-4 right-4 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/95"
        style={{ bottom: drawerBottom, height: drawerHeight }}
      >
        <Pressable
          onPress={() => setDrawerExpanded((current) => !current)}
          className="px-4 pt-3 pb-3"
        >
          <View className="self-center w-12 h-1.5 rounded-full bg-zinc-700" />
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-zinc-100 text-sm font-semibold tracking-wide">
                {headingText}
              </Text>
              <Text className="text-zinc-400 text-xs mt-1">
                {drawerHelperText}
              </Text>
            </View>
            <View className="w-9 h-9 rounded-full border border-zinc-700 items-center justify-center">
              {isDrawerExpanded ? (
                <ChevronDown color="#a1a1aa" size={18} />
              ) : (
                <ChevronUp color="#a1a1aa" size={18} />
              )}
            </View>
          </View>
        </Pressable>

        <Animated.View
          style={{
            flex: 1,
            opacity: drawerBodyOpacity,
            transform: [{ translateY: drawerBodyTranslateY }],
          }}
          pointerEvents={isDrawerExpanded ? "auto" : "none"}
        >
          {filteredListings.length > 0 ? (
            <FlatList
              data={filteredListings}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: 12,
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/property/${item.id}` as any)}
                  className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-zinc-100 text-base font-bold">
                      {formatPeso(item.monthlyRent)}
                    </Text>
                    <View className="flex-row items-center">
                      <BedDouble size={16} color="#a1a1aa" />
                      <Text className="text-zinc-400 text-xs ml-1">
                        student-ready
                      </Text>
                    </View>
                  </View>
                  <Text className="text-zinc-200 mt-2 font-semibold">
                    {item.title}
                  </Text>
                  <Text className="text-zinc-400 text-xs mt-1">
                    {item.meta}
                  </Text>
                </Pressable>
              )}
            />
          ) : (
            <View className="mx-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <Text className="text-zinc-100 font-semibold">
                No apartments found in this range.
              </Text>
              <Text className="text-zinc-400 text-xs mt-1 leading-5">
                Try a wider budget or clear all filters to view every listing.
              </Text>
              <Pressable
                onPress={clearAllFilters}
                className="mt-3 self-start rounded-full border border-zinc-700 px-4 py-2"
              >
                <Text className="text-zinc-200 text-xs font-medium">
                  Clear all
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Animated.View>

      <View className="absolute right-5" style={{ bottom: chatButtonBottom }}>
        <Pressable
          onPress={() => router.push("/chat")}
          className="bg-indigo-600 w-16 h-16 rounded-full items-center justify-center shadow-xl border border-indigo-500/50"
        >
          <Bot color="#fff" size={28} />
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60 px-4 pb-8">
          <View className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <Text className="text-zinc-100 text-xl font-bold">
              Filter apartments
            </Text>
            <Text className="text-zinc-400 text-sm mt-1">
              Set your monthly budget range.
            </Text>

            <View className="mt-5">
              <Text className="text-zinc-300 text-xs uppercase tracking-wide mb-2">
                Minimum budget (PHP)
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={minBudgetInput}
                onChangeText={(value) => {
                  setMinBudgetInput(value.replace(/[^0-9]/g, ""));
                  if (filterError) {
                    setFilterError(null);
                  }
                }}
                placeholder="3000"
                placeholderTextColor="#71717a"
                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100"
              />
            </View>

            <View className="mt-4">
              <Text className="text-zinc-300 text-xs uppercase tracking-wide mb-2">
                Maximum budget (PHP)
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={maxBudgetInput}
                onChangeText={(value) => {
                  setMaxBudgetInput(value.replace(/[^0-9]/g, ""));
                  if (filterError) {
                    setFilterError(null);
                  }
                }}
                placeholder="5500"
                placeholderTextColor="#71717a"
                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100"
              />
            </View>

            {filterError ? (
              <Text className="text-rose-400 text-xs mt-3">{filterError}</Text>
            ) : null}

            <View className="mt-6 flex-row items-center justify-between gap-2">
              <Pressable
                onPress={() => {
                  clearBudgetFilter();
                  setFilterModalVisible(false);
                }}
                className="rounded-full border border-zinc-700 px-4 py-2.5"
              >
                <Text className="text-zinc-200 text-sm font-medium">Reset</Text>
              </Pressable>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setFilterModalVisible(false)}
                  className="rounded-full border border-zinc-700 px-4 py-2.5"
                >
                  <Text className="text-zinc-300 text-sm font-medium">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={applyBudgetFilter}
                  className="rounded-full bg-indigo-600 px-5 py-2.5"
                >
                  <Text className="text-white text-sm font-semibold">
                    Apply
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#09090b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d4d4d8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#18181b" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];
