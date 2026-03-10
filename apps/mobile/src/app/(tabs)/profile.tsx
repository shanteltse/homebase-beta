import { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { useTasks } from "../../hooks/use-tasks";
import { useAchievements } from "../../hooks/use-achievements";
import { ACHIEVEMENTS } from "@repo/shared/constants/achievements";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { data: tasks } = useTasks();
  const { data: unlockedAchievements } = useAchievements();

  const unlockedMap = useMemo(() => {
    const map = new Map<string, string>();
    if (unlockedAchievements) {
      for (const a of unlockedAchievements) {
        map.set(a.type, a.unlockedAt);
      }
    }
    return map;
  }, [unlockedAchievements]);

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const achievementCount = unlockedAchievements?.length ?? 0;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const renderAchievement = ({
    item,
  }: {
    item: (typeof ACHIEVEMENTS)[number];
  }) => {
    const unlockedAt = unlockedMap.get(item.id);
    const isUnlocked = !!unlockedAt;

    return (
      <View
        style={[styles.achievementBadge, !isUnlocked && styles.achievementLocked]}
      >
        <Text style={styles.achievementIcon}>{item.icon}</Text>
        <Text style={styles.achievementName}>{item.name}</Text>
        <Text style={styles.achievementDesc}>{item.description}</Text>
        {isUnlocked && (
          <Text style={styles.achievementDate}>
            {new Date(unlockedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <Text style={styles.userName}>User</Text>
          <Text style={styles.userEmail}>Signed in</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{achievementCount}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Achievements Section */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <FlatList
          data={ACHIEVEMENTS}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.achievementRow}
          scrollEnabled={false}
          contentContainerStyle={styles.achievementGrid}
        />

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons name="settings-outline" size={22} color="#8a7f78" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#8a7f78"
              style={styles.menuChevron}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#8a7f78"
            />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#8a7f78"
              style={styles.menuChevron}
            />
          </TouchableOpacity>
        </View>

        {/* Sign Out Section */}
        <Text style={styles.accountLabel}>Account</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f4",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0e6de",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#b08068",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4a3f3a",
  },
  userEmail: {
    fontSize: 14,
    color: "#8a7f78",
    marginTop: 2,
  },

  // Stats
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
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4a3f3a",
  },
  statLabel: {
    fontSize: 11,
    color: "#8a7f78",
    textTransform: "uppercase",
    marginTop: 2,
  },

  // Achievements
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: serifFont,
    color: "#4a3f3a",
    marginBottom: 12,
  },
  achievementGrid: {
    marginBottom: 24,
  },
  achievementRow: {
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
  achievementLocked: {
    opacity: 0.4,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a3f3a",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 11,
    color: "#8a7f78",
    textAlign: "center",
  },
  achievementDate: {
    fontSize: 10,
    color: "#8a7f78",
    marginTop: 6,
  },

  // Menu
  menuSection: {
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    padding: 16,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 16,
    color: "#4a3f3a",
    marginLeft: 12,
    flex: 1,
  },
  menuChevron: {
    marginLeft: "auto",
  },

  // Account / Sign Out
  accountLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8a7f78",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#dc3545",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc3545",
  },
  bottomSpacer: {
    height: 32,
  },
});
