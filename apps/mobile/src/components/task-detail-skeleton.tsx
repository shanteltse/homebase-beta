import { View, StyleSheet } from "react-native";
import { Skeleton } from "./skeleton";

export function TaskDetailSkeleton() {
  return (
    <View style={styles.container}>
      {/* Status section */}
      <View style={styles.statusRow}>
        <Skeleton width={28} height={28} borderRadius={4} />
        <Skeleton width={80} height={16} />
      </View>

      {/* Title */}
      <Skeleton width="85%" height={22} style={styles.title} />

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Skeleton width={70} height={14} />
          <Skeleton width={60} height={14} />
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Skeleton width={55} height={14} />
          <Skeleton width={70} height={24} borderRadius={12} />
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Skeleton width={65} height={14} />
          <Skeleton width={100} height={14} />
        </View>
      </View>

      {/* Notes section */}
      <Skeleton width={50} height={14} style={styles.sectionLabel} />
      <Skeleton width="100%" height={80} style={styles.notesBlock} />

      {/* Subtasks section */}
      <Skeleton width={70} height={14} style={styles.sectionLabel} />
      <View style={styles.subtasksCard}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.subtaskRow}>
            <Skeleton width={20} height={20} borderRadius={4} />
            <Skeleton width="70%" height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  title: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    marginBottom: 24,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2d9d0",
    marginHorizontal: 16,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  notesBlock: {
    marginBottom: 24,
  },
  subtasksCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    paddingVertical: 4,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
