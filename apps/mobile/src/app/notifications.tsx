import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
} from "../hooks/use-notifications";
import { NotificationSkeleton } from "../components/notification-skeleton";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.notificationUnread]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.notificationTitle}>{item.title}</Text>
      <Text style={styles.notificationBody}>{item.body}</Text>
      <Text style={styles.notificationTime}>{formatTimeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = useCallback(
    (id: string) => {
      markRead.mutate(id);
    },
    [markRead]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#4a3f3a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={8}>
          <Text style={styles.markAllReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={handlePress} />
        )}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#b08068"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View>
              {Array.from({ length: 4 }).map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#e2d9d0" />
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2d9d0",
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }),
    fontSize: 20,
    fontWeight: "bold",
    color: "#4a3f3a",
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#b08068",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  notificationUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#b08068",
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a3f3a",
  },
  notificationBody: {
    fontSize: 13,
    color: "#8a7f78",
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: "#8a7f78",
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: "#8a7f78",
    marginTop: 16,
    fontSize: 16,
  },
});
