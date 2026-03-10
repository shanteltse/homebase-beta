import { View, StyleSheet } from "react-native";
import { Skeleton } from "./skeleton";

export function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.header}>
        <Skeleton width={64} height={64} borderRadius={32} />
        <Skeleton width={140} height={18} style={styles.name} />
        <Skeleton width={180} height={14} style={styles.email} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statBox}>
            <Skeleton width={36} height={20} />
            <Skeleton width={60} height={10} style={styles.statLabel} />
          </View>
        ))}
      </View>

      {/* Achievements title */}
      <Skeleton width={130} height={20} style={styles.sectionTitle} />

      {/* Achievement grid */}
      <View style={styles.achievementRow}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.achievementBadge}>
            <Skeleton width={32} height={32} borderRadius={16} />
            <Skeleton width={80} height={13} style={styles.achieveName} />
            <Skeleton width={60} height={11} />
          </View>
        ))}
      </View>
      <View style={styles.achievementRow}>
        {[3, 4].map((i) => (
          <View key={i} style={styles.achievementBadge}>
            <Skeleton width={32} height={32} borderRadius={16} />
            <Skeleton width={80} height={13} style={styles.achieveName} />
            <Skeleton width={60} height={11} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  name: {
    marginTop: 12,
  },
  email: {
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  achievementRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  achievementBadge: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  achieveName: {
    marginTop: 8,
    marginBottom: 4,
  },
});
