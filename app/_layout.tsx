import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MatchProvider } from "@/providers/MatchProvider";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
    return (
        <Stack
            screenOptions={{
                headerBackTitle: "Back",
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.textPrimary,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
                name="scoring/[id]"
                options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                }}
            />
            <Stack.Screen
                name="scorecard/[id]"
                options={{
                    title: "Scorecard",
                    headerStyle: { backgroundColor: Colors.surface },
                    headerTintColor: Colors.textPrimary,
                }}
            />
            <Stack.Screen
                name="dls-calculator"
                options={{
                    title: "DLS Calculator",
                    headerStyle: { backgroundColor: Colors.surface },
                    headerTintColor: Colors.textPrimary,
                }}
            />
            <Stack.Screen
                name="roster"
                options={{
                    title: "Team Rosters",
                    headerStyle: { backgroundColor: Colors.surface },
                    headerTintColor: Colors.textPrimary,
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
                <MatchProvider>
                    <RootLayoutNav />
                </MatchProvider>
            </GestureHandlerRootView>
        </QueryClientProvider>
    );
}
