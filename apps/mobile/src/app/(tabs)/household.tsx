import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useHousehold,
  useHouseholdMembers,
  useCreateHousehold,
  useJoinHousehold,
  useLeaveHousehold,
} from "../../hooks/use-household";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

// ---------------------------------------------------------------------------
// No-household view
// ---------------------------------------------------------------------------

function NoHouseholdView({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();

  const handleCreate = () => {
    const name = householdName.trim();
    if (!name) return;
    createHousehold.mutate(name, {
      onSuccess: () => setHouseholdName(""),
      onError: (err) => Alert.alert("Error", err.message),
    });
  };

  const handleJoin = () => {
    const code = inviteCode.trim();
    if (!code) return;
    joinHousehold.mutate(code, {
      onSuccess: () => setInviteCode(""),
      onError: (err) => Alert.alert("Error", err.message),
    });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b08068" />
      }
    >
      {/* Header */}
      <View style={styles.emptyHeader}>
        <Ionicons name="home-outline" size={64} color="#e2d9d0" />
        <Text style={styles.title}>Household</Text>
        <Text style={styles.subtitle}>
          Join or create a household to share tasks
        </Text>
      </View>

      {/* Create card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="add-circle-outline" size={24} color="#b08068" />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Create Household</Text>
            <Text style={styles.cardDescription}>
              Start a new household and invite your family or roommates
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Household name"
          placeholderTextColor="#8a7f78"
          value={householdName}
          onChangeText={setHouseholdName}
        />
        <TouchableOpacity
          style={[styles.button, !householdName.trim() && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!householdName.trim() || createHousehold.isPending}
          activeOpacity={0.7}
        >
          {createHousehold.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Join card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="enter-outline" size={24} color="#b08068" />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Join Household</Text>
            <Text style={styles.cardDescription}>
              Enter an invite code to join an existing household
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Invite code"
          placeholderTextColor="#8a7f78"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.button, !inviteCode.trim() && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={!inviteCode.trim() || joinHousehold.isPending}
          activeOpacity={0.7}
        >
          {joinHousehold.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Has-household view
// ---------------------------------------------------------------------------

function HouseholdView({
  household,
  refreshing,
  onRefresh,
}: {
  household: { id: string; name: string; inviteCode: string };
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { data: members, isLoading: membersLoading } = useHouseholdMembers();
  const leaveHousehold = useLeaveHousehold();

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my household on HomeBase! Use invite code: ${household.inviteCode}`,
      });
    } catch {
      // user cancelled
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Household",
      `Are you sure you want to leave "${household.name}"? You will lose access to shared tasks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () =>
            leaveHousehold.mutate(undefined, {
              onError: (err) => Alert.alert("Error", err.message),
            }),
        },
      ],
    );
  };

  const getInitial = (name: string | null) =>
    (name ?? "?").charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b08068" />
      }
    >
      {/* Household title */}
      <Text style={styles.title}>{household.name}</Text>

      {/* Invite code card */}
      <View style={styles.card}>
        <Text style={styles.inviteLabel}>Invite Code</Text>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteCode}>{household.inviteCode}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleShareCode}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={18} color="#b08068" />
            <Text style={styles.copyButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Members */}
      <Text style={styles.sectionLabel}>Members</Text>

      {membersLoading ? (
        <ActivityIndicator
          color="#b08068"
          size="small"
          style={{ marginTop: 12 }}
        />
      ) : (
        (members ?? []).map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitial(member.user.name)}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.user.name ?? member.user.email ?? "Unknown"}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  member.role === "owner"
                    ? styles.ownerBadge
                    : styles.memberBadge,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    member.role === "owner"
                      ? styles.ownerBadgeText
                      : styles.memberBadgeText,
                  ]}
                >
                  {member.role === "owner" ? "Owner" : "Member"}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      {/* Leave button */}
      <TouchableOpacity
        style={styles.leaveButton}
        onPress={handleLeave}
        disabled={leaveHousehold.isPending}
        activeOpacity={0.7}
      >
        {leaveHousehold.isPending ? (
          <ActivityIndicator color="#dc3545" size="small" />
        ) : (
          <Text style={styles.leaveButtonText}>Leave Household</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function HouseholdScreen() {
  const { data: households, isLoading, refetch: refetchHousehold } = useHousehold();
  const household = households?.[0];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchHousehold();
    setRefreshing(false);
  }, [refetchHousehold]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#b08068" size="large" />
        </View>
      ) : household ? (
        <HouseholdView household={household} refreshing={refreshing} onRefresh={onRefresh} />
      ) : (
        <NoHouseholdView refreshing={refreshing} onRefresh={onRefresh} />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f4",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Empty state header
  emptyHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    fontFamily: serifFont,
    color: "#4a3f3a",
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    color: "#8a7f78",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 21,
  },

  // Cards
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#4a3f3a",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#8a7f78",
    lineHeight: 18,
  },

  // Inputs
  input: {
    backgroundColor: "#faf7f4",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#4a3f3a",
    marginBottom: 12,
  },

  // Buttons
  button: {
    backgroundColor: "#b08068",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },

  // Invite code
  inviteLabel: {
    fontSize: 13,
    color: "#8a7f78",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4a3f3a",
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    color: "#b08068",
    fontWeight: "500",
  },

  // Members
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a3f3a",
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0e6de",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#b08068",
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#4a3f3a",
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ownerBadge: {
    backgroundColor: "rgba(176, 128, 104, 0.1)",
  },
  memberBadge: {
    backgroundColor: "#f0e6de",
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ownerBadgeText: {
    color: "#b08068",
  },
  memberBadgeText: {
    color: "#8a7f78",
  },

  // Leave button
  leaveButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#dc3545",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveButtonText: {
    color: "#dc3545",
    fontSize: 15,
    fontWeight: "600",
  },
});
