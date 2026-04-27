import { Stack } from "expo-router";
import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

type RateLimitResult = {
  allowed: boolean;
  retry_after_seconds: number;
  attempts_left: number;
};

const MAX_ATTEMPTS_PER_WINDOW = 5;

export default function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSignUpMode, setIsSignUpMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );

  const normalizedEmail = email.trim().toLowerCase();

  const checkRateLimit = React.useCallback(async (targetEmail: string) => {
    const { data, error } = await supabase.rpc("check_login_rate_limit", {
      p_email: targetEmail,
    });

    if (error) {
      return { status: null as RateLimitResult | null, error: error.message };
    }

    const firstEntry = Array.isArray(data) ? data[0] : null;
    if (!firstEntry) {
      return { status: null as RateLimitResult | null, error: null };
    }

    return {
      status: {
        allowed: Boolean(firstEntry.allowed),
        retry_after_seconds: Number(firstEntry.retry_after_seconds ?? 0),
        attempts_left: Number(
          firstEntry.attempts_left ?? MAX_ATTEMPTS_PER_WINDOW,
        ),
      },
      error: null,
    };
  }, []);

  const recordAttempt = React.useCallback(
    async (targetEmail: string, success: boolean) => {
      const { error } = await supabase.rpc("record_login_attempt", {
        p_email: targetEmail,
        p_success: success,
      });

      return error?.message ?? null;
    },
    [],
  );

  const handleSubmit = React.useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!normalizedEmail.includes("@")) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    if (isSignUpMode) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        setSuccessMessage("Account created. You are now signed in.");
      } else {
        setSuccessMessage(
          "Account created. Check your email for the confirmation link.",
        );
      }

      setIsSubmitting(false);
      return;
    }

    const initialRateLimit = await checkRateLimit(normalizedEmail);
    if (initialRateLimit.status && !initialRateLimit.status.allowed) {
      const seconds = Math.max(1, initialRateLimit.status.retry_after_seconds);
      setErrorMessage(
        `Too many login attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
      );
      setIsSubmitting(false);
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    await recordAttempt(normalizedEmail, !signInResult.error);

    if (signInResult.error) {
      const postFailureRateLimit = await checkRateLimit(normalizedEmail);
      if (postFailureRateLimit.status && !postFailureRateLimit.status.allowed) {
        const seconds = Math.max(
          1,
          postFailureRateLimit.status.retry_after_seconds,
        );
        setErrorMessage(
          `Too many login attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
        );
      } else if (postFailureRateLimit.status) {
        setErrorMessage(
          `Invalid email or password. ${postFailureRateLimit.status.attempts_left} attempt${postFailureRateLimit.status.attempts_left === 1 ? "" : "s"} left in this 1-minute window.`,
        );
      } else {
        setErrorMessage(signInResult.error.message);
      }
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Signed in successfully.");
    setIsSubmitting(false);
  }, [checkRateLimit, isSignUpMode, normalizedEmail, password, recordAttempt]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#09090b" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 justify-center px-6">
        <View className="border border-zinc-800 bg-zinc-950 rounded-3xl p-6">
          <Text className="text-zinc-100 text-3xl font-bold tracking-tight">
            {isSignUpMode ? "Create account" : "Welcome back"}
          </Text>
          <Text className="text-zinc-400 mt-2 text-sm">
            {isSignUpMode
              ? "Use Supabase Auth with email and password."
              : "Sign in to continue to BatBnB."}
          </Text>

          <View className="mt-6">
            <Text className="text-zinc-300 text-xs mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#71717a"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
            />
          </View>

          <View className="mt-4">
            <Text className="text-zinc-300 text-xs mb-2">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor="#71717a"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100"
            />
          </View>

          {errorMessage ? (
            <Text className="text-red-300 text-xs mt-4">{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text className="text-emerald-300 text-xs mt-4">
              {successMessage}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`mt-6 rounded-xl py-3.5 items-center ${
              isSubmitting ? "bg-indigo-500/70" : "bg-indigo-600"
            }`}
          >
            <Text className="text-white font-semibold">
              {isSubmitting
                ? "Please wait..."
                : isSignUpMode
                  ? "Create account"
                  : "Sign in"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setIsSignUpMode((current) => !current);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="mt-4 items-center"
          >
            <Text className="text-indigo-300 text-sm">
              {isSignUpMode
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
