import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
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
    <View className="flex-1 bg-[#060607] items-center justify-center px-6">
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="absolute rounded-full bg-indigo-500/10"
        style={{
          top: -width * 0.35,
          right: -width * 0.15,
          width: width * 1.2,
          height: width * 1.2,
          transform: [{ rotate: "25deg" }],
        }}
      />

      <Animated.View
        className="w-full max-w-[460px] rounded-[20px] p-[28px] bg-zinc-900/60 border border-white/5 items-center shadow-2xl"
        style={{
          opacity: fade,
          transform: [
            {
              translateY: fade.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        }}
      >
        <View className="items-center mb-[18px]">
          <Text className="text-slate-50 text-2xl font-bold mb-[6px] text-center">
            Welcome to BatBnB
          </Text>
          <Text className="text-zinc-400 text-[13px] text-center leading-[18px] max-w-[420px]">
            Student-friendly rooms and apartments near Batangas State
            University.
          </Text>
        </View>

        <View className="w-full mt-[6px]">
          <Pressable
            onPress={() => router.push("/(auth)/login?mode=signup")}
            className="bg-indigo-500 py-[14px] rounded-[14px] items-center mb-3"
          >
            <Text className="text-white font-bold text-base">Get started</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="border border-slate-400/10 py-3 rounded-[14px] items-center"
          >
            <Text className="text-slate-300 font-semibold text-sm">Sign in</Text>
          </Pressable>
        </View>

        <Text className="text-zinc-500 text-[11px] mt-[14px] text-center">
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </Animated.View>
    </View>
  );
}
