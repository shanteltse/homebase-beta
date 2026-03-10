import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../lib/auth-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="create-task"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="task/[id]" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
