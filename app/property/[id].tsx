import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MessageCircleMore, Send } from "lucide-react-native";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { ProximityCard } from "@/components/proximity-card";

type ListingDetails = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  location: string;
  latitude: number;
  longitude: number;
  gallery: string[];
  comments: { id: string; author: string; text: string }[];
};

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();

  const [listing, setListing] = React.useState<ListingDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reviewInput, setReviewInput] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);

  const fetchListing = React.useCallback(
    async (isMounted: { current: boolean }) => {
      if (!id) {
        if (isMounted.current) setLoading(false);
        return;
      }

      const { data: listingData, error } = await supabase
        .from("listings")
        .select(
          `
        id, title, subtitle, monthly_rent, location, latitude, longitude,
        listing_images ( id, image_url, sort_order ),
        listing_reviews ( id, author_label, review_text, created_at )
      `,
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching listing:", error);
      }

      if (listingData && isMounted.current) {
        const sortedImages = (listingData.listing_images || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => img.image_url);

        const comments = (listingData.listing_reviews || [])
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
          .map((r) => ({
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
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          gallery: sortedImages,
          comments,
        });
      }

      if (isMounted.current) setLoading(false);
    },
    [id],
  );

  React.useEffect(() => {
    const isMounted = { current: true };
    fetchListing(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [fetchListing]);

  const handleSubmitReview = React.useCallback(async () => {
    if (!reviewInput.trim() || !user || !id) {
      return;
    }

    setSubmittingReview(true);

    // Generate a default label based on user's email if no name is present
    const authorLabel =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";

    const { error } = await supabase.from("listing_reviews").insert({
      listing_id: id,
      author_id: user.id,
      author_label: authorLabel,
      review_text: reviewInput.trim(),
    });

    if (error) {
      Alert.alert("Error posting review", error.message);
    } else {
      setReviewInput("");
      // refetch reviews
      await fetchListing({ current: true });
    }

    setSubmittingReview(false);
  }, [reviewInput, user, id, fetchListing]);

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

          <ProximityCard
            listingLatitude={listing.latitude}
            listingLongitude={listing.longitude}
          />
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

        <View className="px-5 mt-8 mb-4">
          <Text className="text-zinc-100 text-lg font-semibold">
            Social proof
          </Text>
          <Text className="text-zinc-400 text-sm mt-1">
            Student-reported feedback on internet speed, water, and landlord
            reliability.
          </Text>

          <View className="mt-5 flex-row items-center border border-zinc-800 bg-zinc-950 rounded-2xl overflow-hidden pr-2">
            <TextInput
              value={reviewInput}
              onChangeText={setReviewInput}
              placeholder="Write a review..."
              placeholderTextColor="#71717a"
              className="flex-1 px-4 py-3.5 text-zinc-100"
              multiline
              maxLength={250}
            />
            <Pressable
              onPress={handleSubmitReview}
              disabled={submittingReview || !reviewInput.trim()}
              className={`p-2.5 rounded-xl ${
                reviewInput.trim() ? "bg-indigo-600" : "bg-zinc-800"
              }`}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send
                  size={16}
                  color={reviewInput.trim() ? "#fff" : "#71717a"}
                />
              )}
            </Pressable>
          </View>

          <View className="mt-6 gap-3">
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "position" : undefined}
      >
        <View className="border-t border-zinc-800 bg-[#09090b] px-5 pt-3 pb-8">
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
            <Text className="text-white font-semibold ml-2">
              Message Renter
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
