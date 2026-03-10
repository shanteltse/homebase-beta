import { View, StyleSheet } from "react-native";
import { Skeleton } from "./skeleton";

export function NotificationSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="60%" height={15} />
      <Skeleton width="90%" height={13} style={styles.body} />
      <Skeleton width={50} height={11} style={styles.time} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  body: {
    marginTop: 6,
  },
  time: {
    marginTop: 8,
  },
});
