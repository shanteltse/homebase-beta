import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b08068" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf7f4",
  },
});
