import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/providers/auth-provider";

WebBrowser.maybeCompleteAuthSession();

import "../global.css";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = React.useState(false);
  const previousPath = React.useRef(pathname);

  React.useEffect(() => {
    if (previousPath.current !== pathname) {
      setIsVisible(true);
      previousPath.current = pathname;

      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 220);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [pathname]);

  if (!isVisible) {
    return null;
  }

  return (
    <View pointerEvents="none" className="absolute inset-0 bg-zinc-950/95 items-center justify-center">
      <ActivityIndicator size="small" color="#a5b4fc" />
      <Text className="mt-[10px] text-zinc-400 text-[12px] tracking-[0.4px]">Loading</Text>
    </View>
  );
}

function AuthGate() {
  const { isLoading, session } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    if (__DEV__) {
      // Helpful runtime debug information when developing locally
      // eslint-disable-next-line no-console
      console.log("[AuthGate] isLoading:", isLoading);
      // eslint-disable-next-line no-console
      console.log("[AuthGate] session:", session);
      // eslint-disable-next-line no-console
      console.log("[AuthGate] segments:", segments);
    }

    const inOAuthCallbackRoute =
      segments[0] === "auth" && segments[1] === "callback";

    const alreadyInAuthPath = segments[0] === "(auth)" || segments[0] === "auth";

    if (!session && !alreadyInAuthPath && !inOAuthCallbackRoute) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (session && alreadyInAuthPath) {
      router.replace("/");
    }
  }, [isLoading, router, segments, session]);

  if (!isLoading) {
    return null;
  }

  return (
    <View pointerEvents="none" className="absolute inset-0 bg-zinc-950/95 items-center justify-center">
      <ActivityIndicator size="small" color="#a5b4fc" />
      <Text className="mt-[10px] text-zinc-400 text-[12px] tracking-[0.4px]">Checking session</Text>
    </View>
  );
}

export default function RootLayout() {

  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <View className="flex-1 bg-zinc-950">
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              contentStyle: { backgroundColor: "#09090b" },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="property/[id]" />
            <Stack.Screen name="listing/create" />
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                title: "Modal",
                contentStyle: { backgroundColor: "#09090b" },
              }}
            />
          </Stack>
          <AuthGate />
          <RouteLoadingOverlay />
          <StatusBar style="light" backgroundColor="#09090b" />
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}

