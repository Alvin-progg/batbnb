import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MessageCircleMore } from "lucide-react-native";
import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

type ListingDetails = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  location: string;
  gallery: string[];
  comments: { id: string; author: string; text: string }[];
};

const LISTINGS: Record<string, ListingDetails> = {
  "batstate-hub": {
    id: "batstate-hub",
    title: "BatState Hub Dorm",
    subtitle: "Clean, quiet, and optimized for student routines",
    price: "₱4,500/mo",
    location: "Poblacion, Batangas City",
    gallery: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    ],
    comments: [
      {
        id: "1",
        author: "Kyla, 3rd Year",
        text: "Wi-Fi is stable enough for night classes. Usually 70 to 120 Mbps.",
      },
      {
        id: "2",
        author: "Marco, Engineering",
        text: "Water supply is okay. Best pressure from 6 AM to 10 PM.",
      },
      {
        id: "3",
        author: "Leah, BSIT",
        text: "Landlord responds quickly and does monthly maintenance checks.",
      },
    ],
  },
  "alangilan-suites": {
    id: "alangilan-suites",
    title: "Alangilan Student Suites",
    subtitle: "Minimal layout with easy jeep access to campus",
    price: "₱5,000/mo",
    location: "Alangilan, Batangas City",
    gallery: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1400&q=80",
    ],
    comments: [
      {
        id: "1",
        author: "Jules, 2nd Year",
        text: "Good ventilation and solid study desk setup.",
      },
      {
        id: "2",
        author: "Ria, Accountancy",
        text: "Commute is easy, and nearby karinderias are budget-friendly.",
      },
      {
        id: "3",
        author: "Sean, CE",
        text: "Landlord allows flexible move-in dates for sem starts.",
      },
    ],
  },
};

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const listing = LISTINGS[id ?? "batstate-hub"] ?? LISTINGS["batstate-hub"];

  return (
    <View className="flex-1 bg-[#09090b]">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="pt-14 px-5 pb-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
          >
            <ArrowLeft size={18} color="#e4e4e7" />
          </Pressable>
          <Text className="text-zinc-100 text-3xl font-bold mt-4 tracking-tight">
            {listing.title}
          </Text>
          <Text className="text-zinc-400 mt-2 text-base">
            {listing.subtitle}
          </Text>
          <Text className="text-indigo-300 mt-3 text-xl font-bold">
            {listing.price}
          </Text>
          <Text className="text-zinc-500 mt-1 text-sm">{listing.location}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {listing.gallery.map((uri, index) => (
            <Image
              key={`${listing.id}-${index}`}
              source={{ uri }}
              resizeMode="cover"
              style={{
                width: 290,
                height: 190,
                borderRadius: 20,
                marginRight: 12,
              }}
            />
          ))}
        </ScrollView>

        <View className="px-5 mt-6">
          <Text className="text-zinc-100 text-lg font-semibold">
            Social proof
          </Text>
          <Text className="text-zinc-400 text-sm mt-1">
            Student-reported feedback on internet speed, water, and landlord
            reliability.
          </Text>
          <View className="mt-4 gap-3">
            {listing.comments.map((comment) => (
              <View
                key={comment.id}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
              >
                <Text className="text-zinc-200 font-semibold">
                  {comment.author}
                </Text>
                <Text className="text-zinc-400 text-sm mt-1 leading-5">
                  {comment.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-[#09090b] px-5 pt-3 pb-7">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/chat",
              params: { listing: listing.title },
            })
          }
          className="bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center"
        >
          <MessageCircleMore size={20} color="#ffffff" />
          <Text className="text-white font-semibold ml-2">Message Renter</Text>
        </Pressable>
      </View>
    </View>
  );
}
