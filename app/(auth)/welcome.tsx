import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const fade = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.backgroundAccent} />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fade,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.hero}>
          <Text style={styles.logoEmoji}>🦇</Text>
          <Text style={styles.title}>Welcome to BatBnB</Text>
          <Text style={styles.subtitle}>
            Student-friendly rooms and apartments near Batangas State
            University.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/(auth)/login?mode=signup")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Sign in</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060607",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backgroundAccent: {
    position: "absolute",
    top: -width * 0.35,
    right: -width * 0.15,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "rgba(99,102,241,0.12)",
    transform: [{ rotate: "25deg" }],
  },
  card: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 20,
    padding: 28,
    backgroundColor: "rgba(17,24,39,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
  },
  hero: {
    alignItems: "center",
    marginBottom: 18,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 420,
  },
  actions: {
    width: "100%",
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#CBD5E1",
    fontWeight: "600",
    fontSize: 14,
  },
  terms: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 14,
    textAlign: "center",
  },
});
