import { Tabs } from "expo-router";
import {
    Heart,
    LayoutDashboard,
    Map,
    MessageCircle,
    UserCircle,
} from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useAuth } from "@/providers/auth-provider";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isOwner } = useAuth();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 8 : 12,
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
          bottom: 0,
          left: 12,
          right: 12,
          elevation: 0,
          height: 56 + bottomInset,
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
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <MessageCircle size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <UserCircle size={24} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={24} color={color} strokeWidth={2.5} />
          ),
          href: isOwner ? "/dashboard" : null,
        }}
      />
    </Tabs>
  );
}
