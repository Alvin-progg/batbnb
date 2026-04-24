import { Tabs } from "expo-router";
import { Heart, Map } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 10 : 12,
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#666",
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#09090b",
        },
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#09090b", // strict dark shadcn background
          borderTopWidth: 1,
          borderTopColor: "#27272a", // zinc-800
          position: "absolute",
          bottom: bottomInset,
          left: 12,
          right: 12,
          elevation: 0,
          height: 58 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          borderRadius: 18,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Map size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => (
            <Heart size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tabs>
  );
}
