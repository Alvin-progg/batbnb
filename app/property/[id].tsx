import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MessageCircleMore } from "lucide-react-native";
import React from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

type ListingDetails = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  location: string;
  gallery: string[];
  comments: { id: string; author: string; text: string }[];
};

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [listing, setListing] = React.useState<ListingDetails | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchListing() {
      if (!id) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      const { data: listingData, error } = await supabase
        .from("listings")
        .select(
          `
          id, title, subtitle, monthly_rent, location,
          listing_images ( id, image_url, sort_order ),
          listing_reviews ( id, author_label, review_text )
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching listing:", error);
      }

      if (listingData && isMounted) {
        const sortedImages = (listingData.listing_images || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => img.image_url);

        const comments = (listingData.listing_reviews || []).map((r) => ({
          id: r.id,
          author: r.author_label,
          text: r.review_text,
        }));

        setListing({
          id: listingData.id,
          title: listingData.title,
          subtitle: listingData.subtitle || "",
          price: `₱${new Intl.NumberFormat("en-PH").format(listingData.monthly_rent)}/mo`,
          location: listingData.location,
          gallery: sortedImages,
          comments,
        });
      }

      if (isMounted) setLoading(false);
    }

    fetchListing();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#09090b] items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="small" color="#a5b4fc" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 bg-[#09090b] items-center justify-center space-y-4">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-zinc-400">Listing not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-zinc-800 px-4 py-2 rounded-full"
        >
          <Text className="text-zinc-100">Go Back</Text>
        </Pressable>
      </View>
    );
  }

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
