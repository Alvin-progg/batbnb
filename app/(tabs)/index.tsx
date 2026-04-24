import { useRouter } from "expo-router";
import { BedDouble, Bot, Search, SlidersHorizontal } from "lucide-react-native";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const listings = [
  {
    id: "batstate-hub",
    title: "BatState Hub Dorm",
    price: "₱4.5k",
    latitude: 13.76,
    longitude: 121.055,
    meta: "1 BR · 12 min to BSU",
  },
  {
    id: "alangilan-suites",
    title: "Alangilan Student Suites",
    price: "₱5.0k",
    latitude: 13.75,
    longitude: 121.06,
    meta: "Studio · near transport",
  },
];

export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tabInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 12);
  const overlayBottom = 56 + tabInset + 12;

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
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
          >
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/property/[id]",
                  params: { id: listing.id },
                })
              }
            >
              <View className="bg-zinc-950 border border-zinc-700 px-3 py-1.5 rounded-full shadow-md">
                <Text className="text-zinc-100 font-bold text-sm tracking-tight">
                  {listing.price}
                </Text>
              </View>
            </Pressable>
          </Marker>
        ))}
      </MapView>

      <View className="absolute w-full px-4" style={{ top: insets.top + 16 }}>
        <View className="flex-row items-center bg-[#09090b]/85 border border-zinc-800 rounded-full px-4 py-3.5 shadow-lg overflow-hidden">
          <Search color="#a1a1aa" size={20} />
          <TextInput
            placeholder="Near Batangas State U, under 4k"
            placeholderTextColor="#71717a"
            className="flex-1 text-zinc-100 ml-3 text-base leading-tight font-medium"
          />
          <Pressable className="bg-zinc-800 p-2 rounded-full ml-2">
            <SlidersHorizontal color="#e4e4e7" size={16} />
          </Pressable>
        </View>
      </View>

      <View
        className="absolute left-0 right-0"
        style={{ bottom: overlayBottom }}
      >
        <Text className="text-zinc-100 text-sm font-semibold px-4 mb-3 tracking-wide">
          Budget picks near Batangas State U
        </Text>
        <FlatList
          data={listings}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/property/[id]",
                  params: { id: item.id },
                })
              }
              className="w-64 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mr-3"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-zinc-100 text-lg font-bold">
                  {item.price}
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
              <Text className="text-zinc-400 text-xs mt-1">{item.meta}</Text>
            </Pressable>
          )}
        />
      </View>

      <View className="absolute right-5" style={{ bottom: overlayBottom }}>
        <Pressable
          onPress={() => router.push("/chat")}
          className="bg-indigo-600 w-16 h-16 rounded-full items-center justify-center shadow-xl border border-indigo-500/50"
        >
          <Bot color="#fff" size={28} />
        </Pressable>
      </View>
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
