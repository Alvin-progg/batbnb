import * as Location from "expo-location";
import { Footprints, MapPin, Navigation } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from "react-native";

import {
  BATSTATEU_COORDS,
  distanceToCampusKm,
  formatDistance,
  formatDuration,
  getRoute,
  haversineDistanceKm,
} from "@/lib/distance";

type ProximityCardProps = {
  listingLatitude: number;
  listingLongitude: number;
};

type RouteInfo = {
  walkMinutes: number;
  walkDistanceKm: number;
} | null;

export function ProximityCard({
  listingLatitude,
  listingLongitude,
}: ProximityCardProps) {
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo>(null);
  const [isLoadingRoute, setIsLoadingRoute] = React.useState(true);
  const [userDistanceKm, setUserDistanceKm] = React.useState<number | null>(
    null,
  );
  const [locationError, setLocationError] = React.useState<string | null>(null);

  const listingCoords = React.useMemo(
    () => ({ latitude: listingLatitude, longitude: listingLongitude }),
    [listingLatitude, listingLongitude],
  );

  const straightLineKm = React.useMemo(
    () => distanceToCampusKm(listingCoords),
    [listingCoords],
  );

  // Fetch the walking route to BatStateU
  React.useEffect(() => {
    let isMounted = true;

    async function fetchRoute() {
      const result = await getRoute(listingCoords, BATSTATEU_COORDS, "foot");
      if (isMounted) {
        if (result) {
          setRouteInfo({
            walkMinutes: result.durationMinutes,
            walkDistanceKm: result.distanceKm,
          });
        }
        setIsLoadingRoute(false);
      }
    }

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [listingCoords]);

  // Optionally get the student's current location for "distance from you"
  React.useEffect(() => {
    let isMounted = true;

    async function getStudentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) setLocationError("Location permission not granted");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          const studentCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          const dist = haversineDistanceKm(studentCoords, listingCoords);
          setUserDistanceKm(dist);
        }
      } catch {
        if (isMounted) setLocationError("Could not get location");
      }
    }

    getStudentLocation();
    return () => {
      isMounted = false;
    };
  }, [listingCoords]);

  const handleOpenDirections = React.useCallback(() => {
    const destination = `${BATSTATEU_COORDS.latitude},${BATSTATEU_COORDS.longitude}`;
    const origin = `${listingLatitude},${listingLongitude}`;

    const url = Platform.select({
      ios: `maps://app?saddr=${origin}&daddr=${destination}&dirflg=w`,
      android: `google.navigation:q=${destination}&mode=w`,
      default: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`,
    });

    if (url) Linking.openURL(url);
  }, [listingLatitude, listingLongitude]);

  return (
    <View className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-5">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 rounded-full bg-indigo-600/20 items-center justify-center mr-3">
          <MapPin size={16} color="#818cf8" />
        </View>
        <View className="flex-1">
          <Text className="text-zinc-100 font-semibold text-sm">
            Distance to BatStateU
          </Text>
          <Text className="text-zinc-500 text-xs">
            Pablo Borbon Main Campus
          </Text>
        </View>
      </View>

      {/* Route stats */}
      <View className="flex-row gap-3">
        {/* Walking time */}
        <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <View className="flex-row items-center mb-1">
            <Footprints size={14} color="#a5b4fc" />
            <Text className="text-zinc-400 text-xs ml-1.5">Walking</Text>
          </View>
          {isLoadingRoute ? (
            <ActivityIndicator
              size="small"
              color="#a5b4fc"
              style={{ marginTop: 4 }}
            />
          ) : routeInfo ? (
            <>
              <Text className="text-zinc-100 text-lg font-bold">
                {formatDuration(routeInfo.walkMinutes)}
              </Text>
              <Text className="text-zinc-500 text-xs">
                {formatDistance(routeInfo.walkDistanceKm)} walk
              </Text>
            </>
          ) : (
            <>
              <Text className="text-zinc-100 text-lg font-bold">
                ~{formatDistance(straightLineKm)}
              </Text>
              <Text className="text-zinc-500 text-xs">straight line</Text>
            </>
          )}
        </View>

        {/* Straight-line distance */}
        <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <View className="flex-row items-center mb-1">
            <Navigation size={14} color="#a5b4fc" />
            <Text className="text-zinc-400 text-xs ml-1.5">Distance</Text>
          </View>
          <Text className="text-zinc-100 text-lg font-bold">
            {formatDistance(straightLineKm)}
          </Text>
          <Text className="text-zinc-500 text-xs">
            {userDistanceKm !== null
              ? `${formatDistance(userDistanceKm)} from you`
              : locationError
                ? "Location unavailable"
                : "Getting your location..."}
          </Text>
        </View>
      </View>

      {/* Open directions button */}
      <Pressable
        onPress={handleOpenDirections}
        className="mt-3 bg-indigo-600/15 border border-indigo-500/20 rounded-xl py-3 flex-row items-center justify-center"
      >
        <MapPin size={16} color="#818cf8" />
        <Text className="text-indigo-300 font-semibold text-sm ml-2">
          Get Directions to Campus
        </Text>
      </Pressable>
    </View>
  );
}
