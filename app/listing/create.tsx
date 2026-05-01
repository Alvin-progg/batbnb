import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, ImagePlus, MapPin, X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

type ImageAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function CreateListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isOwner } = useAuth();

  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [monthlyRent, setMonthlyRent] = React.useState("");
  const [markerCoord, setMarkerCoord] = React.useState({
    latitude: 13.7565,
    longitude: 121.0583,
  });
  const [meta, setMeta] = React.useState("");
  const [images, setImages] = React.useState<ImageAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const initialRegion: Region = {
    latitude: 13.7565,
    longitude: 121.0583,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const pickImages = React.useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant photo library access to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 6,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, 6));
    }
  }, []);

  const removeImage = React.useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = React.useCallback(async () => {
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }
    if (!monthlyRent.trim() || isNaN(Number(monthlyRent))) {
      setError("Enter a valid monthly rent amount.");
      return;
    }
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    setIsSubmitting(true);

    try {
      const slug = slugify(title) || `listing-${Date.now()}`;

      // 1. Insert the listing
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          location: location.trim(),
          monthly_rent: Number(monthlyRent),
          latitude: markerCoord.latitude,
          longitude: markerCoord.longitude,
          meta: meta.trim() || null,
          slug,
          owner_id: user.id,
          status: "active",
        })
        .select("id")
        .single();

      if (listingError) {
        setError(`Failed to create listing: ${listingError.message}`);
        setIsSubmitting(false);
        return;
      }

      const listingId = listingData.id;

      // 2. Upload images to Supabase Storage and insert into listing_images
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const fileExt = img.fileName.split(".").pop() || "jpg";
        const storagePath = `listings/${listingId}/${i}_${Date.now()}.${fileExt}`;

        // Read file as blob
        const response = await fetch(img.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(storagePath, blob, {
            contentType: img.mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          continue; // Skip failed uploads but continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(storagePath);

        if (urlData?.publicUrl) {
          await supabase.from("listing_images").insert({
            listing_id: listingId,
            image_url: urlData.publicUrl,
            sort_order: i,
          });
        }
      }

      Alert.alert("Success", "Your listing has been published!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }, [title, subtitle, location, monthlyRent, markerCoord, meta, images, user, router]);

  if (!isOwner) {
    return (
      <View className="flex-1 bg-[#09090b] items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-zinc-400 text-center">
          You don't have permission to create listings.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-zinc-800 px-4 py-2 rounded-full"
        >
          <Text className="text-zinc-100">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#09090b]">
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-5 pb-4 flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center mr-3"
            >
              <ArrowLeft size={18} color="#e4e4e7" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-zinc-100 text-2xl font-bold tracking-tight">
                New Listing
              </Text>
              <Text className="text-zinc-500 text-xs mt-0.5">
                Publish a property for BatStateU students
              </Text>
            </View>
          </View>

          <View className="px-5 gap-4">
            {/* Title */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Property Title *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cozy Studio near BatStateU Gate"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
              />
            </View>

            {/* Subtitle */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Subtitle
              </Text>
              <TextInput
                value={subtitle}
                onChangeText={setSubtitle}
                placeholder="e.g. Fully furnished, WiFi included"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
              />
            </View>

            {/* Location */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Location / Address *
              </Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Brgy. Kumintang Ibaba, Batangas City"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
              />
            </View>

            {/* Monthly Rent */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Monthly Rent (₱) *
              </Text>
              <TextInput
                value={monthlyRent}
                onChangeText={(v) => setMonthlyRent(v.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 3500"
                placeholderTextColor="#71717a"
                keyboardType="number-pad"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
              />
            </View>

            {/* Pin Location on Map */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Pin Location *
              </Text>
              <Text className="text-zinc-500 text-xs mb-2">
                Move the map to place the pin on your property
              </Text>
              <View className="rounded-2xl overflow-hidden border border-zinc-800 relative">
                <MapView
                  style={mapStyles.map}
                  initialRegion={initialRegion}
                  mapType="standard"
                  userInterfaceStyle="dark"
                  customMapStyle={darkMapStyle}
                  onRegionChangeComplete={(region) => {
                    setMarkerCoord({
                      latitude: region.latitude,
                      longitude: region.longitude,
                    });
                  }}
                />
                
                {/* Fixed Center Pin Overlay */}
                <View 
                  className="absolute inset-0 items-center justify-center pointer-events-none"
                  pointerEvents="none"
                >
                  <View className="items-center -mt-8">
                    <View className="bg-indigo-600 w-8 h-8 rounded-full items-center justify-center shadow-lg border-2 border-zinc-950">
                      <MapPin size={16} color="#ffffff" />
                    </View>
                    <View
                      style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: 6,
                        borderRightWidth: 6,
                        borderTopWidth: 8,
                        borderLeftColor: "transparent",
                        borderRightColor: "transparent",
                        borderTopColor: "#4f46e5",
                        marginTop: -2,
                      }}
                    />
                  </View>
                </View>
              </View>
              <View className="flex-row items-center mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                <MapPin size={14} color="#818cf8" />
                <Text className="text-zinc-400 text-xs ml-2">
                  {markerCoord.latitude.toFixed(6)}, {markerCoord.longitude.toFixed(6)}
                </Text>
              </View>
            </View>

            {/* Meta */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Tags / Meta
              </Text>
              <TextInput
                value={meta}
                onChangeText={setMeta}
                placeholder="e.g. 1 BR · Solo · WiFi · Near Gate 1"
                placeholderTextColor="#71717a"
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
              />
            </View>

            {/* Image Upload */}
            <View>
              <Text className="text-zinc-300 text-xs mb-2 uppercase tracking-wide">
                Photos ({images.length}/6)
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {images.map((img, idx) => (
                  <View key={img.uri} className="relative">
                    <Image
                      source={{ uri: img.uri }}
                      style={{ width: 100, height: 100, borderRadius: 12 }}
                    />
                    <Pressable
                      onPress={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                    >
                      <X size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}

                {images.length < 6 && (
                  <Pressable
                    onPress={pickImages}
                    className="w-[100px] h-[100px] rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 items-center justify-center"
                  >
                    <ImagePlus size={24} color="#71717a" />
                    <Text className="text-zinc-500 text-[10px] mt-1">
                      Add
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Error */}
            {error && (
              <Text className="text-red-400 text-xs">{error}</Text>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`rounded-2xl py-4 items-center mt-2 ${
                isSubmitting ? "bg-indigo-500/50" : "bg-indigo-600"
              }`}
            >
              {isSubmitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-semibold ml-2">
                    Publishing...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">
                  Publish Listing
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  map: {
    width: "100%",
    height: 220,
  },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a1a1aa" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#52525b" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1c1917" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3f3f46" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0c0a09" }],
  },
];
