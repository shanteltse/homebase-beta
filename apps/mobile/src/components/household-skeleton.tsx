import { View, StyleSheet } from "react-native";
import { Skeleton } from "./skeleton";

export function HouseholdSkeleton() {
  return (
    <View style={styles.container}>
      {/* Household title */}
      <Skeleton width={180} height={26} style={styles.title} />

      {/* Invite code card */}
      <View style={styles.card}>
        <Skeleton width={90} height={12} style={styles.label} />
        <View style={styles.inviteRow}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={36} borderRadius={8} />
        </View>
      </View>

      {/* Members label */}
      <Skeleton width={70} height={15} style={styles.membersLabel} />

      {/* Member cards */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.memberCard}>
          <Skeleton width={42} height={42} borderRadius={21} />
          <View style={styles.memberInfo}>
            <Skeleton width={120} height={15} />
            <Skeleton width={55} height={22} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function MemberSkeleton() {
  return (
    <View style={styles.memberCard}>
      <Skeleton width={42} height={42} borderRadius={21} />
      <View style={styles.memberInfo}>
        <Skeleton width={120} height={15} />
        <Skeleton width={55} height={22} borderRadius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginTop: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  membersLabel: {
    marginBottom: 12,
    marginTop: 8,
  },
  memberCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
