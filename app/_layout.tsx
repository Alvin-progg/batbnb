import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/providers/auth-provider";

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
    <View pointerEvents="none" style={styles.loadingOverlay}>
      <ActivityIndicator size="small" color="#a5b4fc" />
      <Text style={styles.loadingText}>Loading</Text>
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

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [isLoading, router, segments, session]);

  if (!isLoading) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.loadingOverlay}>
      <ActivityIndicator size="small" color="#a5b4fc" />
      <Text style={styles.loadingText}>Checking session</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <View style={styles.container}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              contentStyle: styles.screenContent,
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="property/[id]" />
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                title: "Modal",
                contentStyle: styles.screenContent,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  screenContent: {
    backgroundColor: "#09090b",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 9, 11, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
