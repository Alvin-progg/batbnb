import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

function readAuthCallbackParam(url: string, key: string): string | null {
  const [urlWithoutHash, hash = ""] = url.split("#");
  const query = urlWithoutHash.includes("?")
    ? urlWithoutHash.split("?")[1]
    : "";

  const queryParams = new URLSearchParams(query);
  const hashParams = new URLSearchParams(hash);

  return queryParams.get(key) ?? hashParams.get(key);
}

function decodeSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const liveUrl = Linking.useURL();
  const [message, setMessage] = React.useState("Finalizing OAuth sign-in...");
  const [canGoBackToLogin, setCanGoBackToLogin] = React.useState(false);
  const processedUrlRef = React.useRef<string | null>(null);
  const fallbackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const completeOAuth = React.useCallback(
    async (url: string) => {
      if (processedUrlRef.current === url) {
        return;
      }
      processedUrlRef.current = url;

      const callbackError =
        readAuthCallbackParam(url, "error_description") ??
        readAuthCallbackParam(url, "error");

      if (callbackError) {
        setMessage(`OAuth failed: ${decodeSafe(callbackError)}`);
        setCanGoBackToLogin(true);
        return;
      }

      const accessToken = readAuthCallbackParam(url, "access_token");
      const refreshToken = readAuthCallbackParam(url, "refresh_token");
      const authCode = readAuthCallbackParam(url, "code");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(`Session error: ${error.message}`);
          setCanGoBackToLogin(true);
          return;
        }

        router.replace("/");
        return;
      }

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          setMessage(`Exchange error: ${error.message}`);
          setCanGoBackToLogin(true);
          return;
        }

        router.replace("/");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
        return;
      }

      setMessage("Waiting for OAuth session...");
      setCanGoBackToLogin(false);

      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }

      fallbackTimeoutRef.current = setTimeout(async () => {
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();

        if (delayedSession) {
          router.replace("/");
          return;
        }

        setMessage(
          "Missing OAuth token in callback URL. Please retry Google sign-in.",
        );
        setCanGoBackToLogin(true);
      }, 2500);
    },
    [router],
  );

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  React.useEffect(() => {
    if (!liveUrl) {
      return;
    }
    void completeOAuth(liveUrl);
  }, [completeOAuth, liveUrl]);

  React.useEffect(() => {
    const hydrateFromInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (!initialUrl) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace("/");
          return;
        }

        setMessage("Waiting for OAuth callback...");
        return;
      }

      await completeOAuth(initialUrl);
    };

    void hydrateFromInitialUrl();
  }, [completeOAuth, router]);

  React.useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        paddingHorizontal: 24,
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="small" color="#a5b4fc" />
      <Text
        style={{
          color: "#d4d4d8",
          marginTop: 12,
          textAlign: "center",
          fontSize: 13,
        }}
      >
        {message}
      </Text>
      {canGoBackToLogin ? (
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{
            marginTop: 14,
            borderWidth: 1,
            borderColor: "#3f3f46",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: "#18181b",
          }}
        >
          <Text style={{ color: "#e4e4e7", fontSize: 12, fontWeight: "600" }}>
            Back to Login
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
