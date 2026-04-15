import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTasks, useUpdateTask, useDeleteTask, useCreateTask } from "../../hooks/use-tasks";
import { useHouseholdMembers } from "../../hooks/use-household";
import { useNotifications } from "../../hooks/use-notifications";
import { TaskSkeleton } from "../../components/task-skeleton";
import { api } from "../../lib/api";
import type { Task, CreateTaskInput } from "@repo/shared/types/task";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

type FilterTab = "all" | "active" | "completed" | "starred";
type SortMode = "newest" | "priority" | "dueDate";

const SORT_LABELS: Record<SortMode, string> = {
  newest: "Sort: Newest",
  priority: "Sort: Priority",
  dueDate: "Sort: Due Date",
};

const SORT_ORDER: SortMode[] = ["newest", "priority", "dueDate"];

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityStyles: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  high: { backgroundColor: "rgba(220,53,69,0.1)", color: "#dc3545" },
  medium: { backgroundColor: "rgba(232,168,56,0.1)", color: "#e8a838" },
  low: { backgroundColor: "rgba(124,154,142,0.1)", color: "#7c9a8e" },
  urgent: { backgroundColor: "rgba(220,53,69,0.15)", color: "#dc3545" },
};

const categoryStyles: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  home: { backgroundColor: "rgba(176,128,104,0.1)", color: "#b08068" },
  personal: { backgroundColor: "rgba(124,154,142,0.1)", color: "#7c9a8e" },
  work: { backgroundColor: "rgba(139,123,180,0.1)", color: "#8b7bb4" },
};

// The /api/households/members endpoint returns flat user objects (id = userId).
// The mobile hook type has a nested shape; cast to this flat runtime type.
type FlatMember = {
  id: string; // user's ID — matches task.assignee and task.userId
  name: string | null;
  email: string | null;
};

const AVATAR_PALETTE = ["#b08068", "#7c9a8e", "#8b7bb4", "#4a7fa5", "#e8a838"];

function MemberProgressCard({
  member,
  tasks,
  colorIdx,
  horizontal,
}: {
  member: FlatMember;
  tasks: Task[];
  colorIdx: number;
  horizontal: boolean;
}) {
  const memberTasks = tasks.filter(
    (t) => t.assignee === member.id || t.userId === member.id,
  );
  const activeCount = memberTasks.filter((t) => t.status !== "completed").length;
  const total = memberTasks.length;
  const completedCount = total - activeCount;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const displayName = member.name ?? member.email ?? "Member";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const color = AVATAR_PALETTE[colorIdx % AVATAR_PALETTE.length]!;

  return (
    <View
      style={[
        householdStyles.memberCard,
        horizontal && householdStyles.memberCardH,
      ]}
    >
      <View style={[householdStyles.avatar, { backgroundColor: color + "22" }]}>
        <Text style={[householdStyles.avatarText, { color }]}>{initials}</Text>
      </View>
      <View style={householdStyles.memberInfo}>
        <Text style={householdStyles.memberName} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={householdStyles.bar}>
          <View
            style={[
              householdStyles.barFill,
              { flex: pct > 0 ? pct : 0, backgroundColor: color },
            ]}
          />
          <View style={{ flex: 100 - pct }} />
        </View>
        <Text style={householdStyles.memberStats}>
          {activeCount} active · {pct}%
        </Text>
      </View>
    </View>
  );
}

function HouseholdOverview({
  members,
  tasks,
}: {
  members: FlatMember[];
  tasks: Task[];
}) {
  const [open, setOpen] = useState(true);
  const isHorizontal = members.length >= 3;

  const sectionHeader = (
    <View style={householdStyles.sectionHeader}>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
        style={householdStyles.toggleButton}
      >
        <Text style={householdStyles.sectionHeading}>Household</Text>
        <Ionicons
          name={open ? "chevron-down" : "chevron-forward"}
          size={13}
          color="#8a7f78"
        />
      </TouchableOpacity>
      {open && (
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/household")}
          hitSlop={8}
        >
          <Text style={householdStyles.viewAll}>View all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={householdStyles.container}>
      {sectionHeader}
      {open && (
        isHorizontal ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={householdStyles.horizontalScroll}
          >
            {members.map((m, i) => (
              <MemberProgressCard
                key={m.id}
                member={m}
                tasks={tasks}
                colorIdx={i}
                horizontal
              />
            ))}
          </ScrollView>
        ) : (
          <>
            {members.map((m, i) => (
              <MemberProgressCard
                key={m.id}
                member={m}
                tasks={tasks}
                colorIdx={i}
                horizontal={false}
              />
            ))}
          </>
        )
      )}
    </View>
  );
}

function TaskItem({ task }: { task: Task }) {
  const priority = priorityStyles[task.priority] ?? priorityStyles.low;
  const category =
    task.category ? categoryStyles[task.category.toLowerCase()] : null;
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleToggleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isCompleted = task.status === "completed";
    updateTask.mutate({
      id: task.id,
      status: isCompleted ? "active" : "completed",
      completed: !isCompleted,
    });
  }, [task.id, task.status, updateTask]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isCompleted = task.status === "completed";
    Alert.alert("Task Actions", task.title, [
      {
        text: isCompleted ? "Mark Active" : "Mark Complete",
        onPress: handleToggleComplete,
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => deleteTask.mutate(task.id),
            },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [task.id, task.title, task.status, handleToggleComplete, deleteTask]);

  return (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => router.push(`/task/${task.id}`)}
      onLongPress={handleLongPress}
    >
      <TouchableOpacity onPress={handleToggleComplete}>
        <View
          style={[
            styles.checkbox,
            task.status === "completed"
              ? styles.checkboxCompleted
              : styles.checkboxIncomplete,
          ]}
        >
          {task.status === "completed" && (
            <Ionicons name="checkmark" size={12} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <View style={styles.taskTitleRow}>
          {task.starred && (
            <Ionicons name="star" size={12} color="#e8a838" style={styles.starIcon} />
          )}
          <Text
            style={[
              styles.taskTitle,
              task.status === "completed" && styles.taskTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>
        <View style={styles.badgesRow}>
          <View
            style={[styles.priorityBadge, { backgroundColor: priority.backgroundColor }]}
          >
            <Text style={[styles.priorityText, { color: priority.color }]}>
              {task.priority}
            </Text>
          </View>
          {category && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: category.backgroundColor },
              ]}
            >
              <Text style={[styles.categoryText, { color: category.color }]}>
                {task.category}
              </Text>
            </View>
          )}
          {task.dueDate ? (
            <Text style={styles.dueDate}>
              Due {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function compareTasks(a: Task, b: Task, mode: SortMode): number {
  switch (mode) {
    case "priority": {
      const rankA = PRIORITY_RANK[a.priority] ?? 3;
      const rankB = PRIORITY_RANK[b.priority] ?? 3;
      if (rankA !== rankB) return rankA - rankB;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }
    case "dueDate": {
      const hasDueA = a.dueDate ? 0 : 1;
      const hasDueB = b.dueDate ? 0 : 1;
      if (hasDueA !== hasDueB) return hasDueA - hasDueB;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }
    case "newest":
    default: {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }
  }
}

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  const sortGroup = (group: Task[]) => {
    const starred = group.filter((t) => t.starred).sort((a, b) => compareTasks(a, b, mode));
    const rest = group.filter((t) => !t.starred).sort((a, b) => compareTasks(a, b, mode));
    return [...starred, ...rest];
  };
  return [
    ...sortGroup(tasks.filter((t) => t.status !== "completed")),
    ...sortGroup(tasks.filter((t) => t.status === "completed")),
  ];
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "starred", label: "⭐ Starred" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

interface ParsedTaskResponse {
  parsed: {
    title: string;
    category?: string;
    subcategory?: string;
    priority?: "high" | "medium" | "low";
    dueDate?: string;
    tags?: string[];
    notes?: string;
  };
}

export default function TasksScreen() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const { data: notifications } = useNotifications();
  const { data: rawMembers } = useHouseholdMembers();
  const householdMembers = (rawMembers ?? []) as unknown as FlatMember[];
  const showHouseholdOverview = householdMembers.length > 1;
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [smartInput, setSmartInput] = useState("");
  const [smartInputLoading, setSmartInputLoading] = useState(false);
  const [smartInputError, setSmartInputError] = useState<string | null>(null);
  const smartInputRef = useRef<TextInput>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleSmartSubmit = useCallback(async () => {
    const text = smartInput.trim();
    if (!text || smartInputLoading) return;

    setSmartInputLoading(true);
    setSmartInputError(null);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);

    try {
      const { parsed } = await api<ParsedTaskResponse>("/api/ai/parse-task", {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      const taskData: CreateTaskInput = {
        title: parsed.title,
        category: parsed.category ?? "personal",
        priority: parsed.priority ?? "medium",
        subtasks: [],
        tags: parsed.tags?.length ? parsed.tags : [],
        links: [],
        ...(parsed.dueDate ? { dueDate: parsed.dueDate } : {}),
        ...(parsed.subcategory ? { subcategory: parsed.subcategory } : {}),
        ...(parsed.notes ? { notes: parsed.notes } : {}),
      };

      createTask.mutate(taskData);
      setSmartInput("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse task";
      setSmartInputError(message);
      errorTimerRef.current = setTimeout(() => setSmartInputError(null), 3000);
    } finally {
      setSmartInputLoading(false);
    }
  }, [smartInput, smartInputLoading, createTask]);

  const handleCycleSortMode = useCallback(() => {
    setSortMode((current) => {
      const idx = SORT_ORDER.indexOf(current);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredTasks = useMemo(() => {
    let result = (tasks ?? []).filter((task) => {
      if (activeFilter === "active") return task.status !== "completed";
      if (activeFilter === "completed") return task.status === "completed";
      if (activeFilter === "starred") return task.starred === true;
      return true;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((task) =>
        task.title.toLowerCase().includes(query)
      );
    }

    return sortTasks(result, sortMode);
  }, [tasks, activeFilter, searchQuery, sortMode]);

  const filterLabel =
    activeFilter === "all" ? "" :
    activeFilter === "starred" ? "starred " :
    `${activeFilter} `;
  const taskCountText = `${filteredTasks.length} ${filterLabel}task${filteredTasks.length !== 1 ? "s" : ""}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HomeBase</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push("/notifications")}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color="#8a7f78" />
            {(notifications ?? []).filter((n) => !n.read).length > 0 && (
              <View style={styles.bellBadge} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/create-task")}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#8a7f78" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor="#8a7f78"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#8a7f78" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              activeFilter === tab.key
                ? styles.filterTabActive
                : styles.filterTabInactive,
            ]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab.key
                  ? styles.filterTabTextActive
                  : styles.filterTabTextInactive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort toggle and task count */}
      <View style={styles.sortCountRow}>
        <Text style={styles.taskCount}>{taskCountText}</Text>
        <TouchableOpacity onPress={handleCycleSortMode} hitSlop={8}>
          <Text style={styles.sortButton}>{SORT_LABELS[sortMode]}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.smartInputContainer}>
        <View style={styles.smartInputBar}>
          {smartInputLoading ? (
            <ActivityIndicator size="small" color="#b08068" style={styles.smartInputIcon} />
          ) : (
            <Ionicons name="sparkles" size={18} color="#b08068" style={styles.smartInputIcon} />
          )}
          <TextInput
            ref={smartInputRef}
            style={styles.smartInputText}
            placeholder="e.g. dentist appointment next Tuesday"
            placeholderTextColor="#b0a89f"
            value={smartInput}
            onChangeText={setSmartInput}
            returnKeyType="send"
            onSubmitEditing={handleSmartSubmit}
            editable={!smartInputLoading}
          />
        </View>
        {smartInputError ? (
          <Text style={styles.smartInputErrorText}>{smartInputError}</Text>
        ) : null}
      </View>

      {showHouseholdOverview && (
        <HouseholdOverview members={householdMembers} tasks={tasks ?? []} />
      )}

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <TaskSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
          <Text style={styles.errorText}>Failed to load tasks</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskItem task={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
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
            <View style={styles.emptyContainer}>
              <Ionicons name="checkbox-outline" size={64} color="#e2d9d0" />
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to create your first task</Text>
            </View>
          }
        />
      )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: serifFont,
    color: "#4a3f3a",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellButton: {
    position: "relative",
    padding: 4,
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc3545",
  },
  addButton: {
    backgroundColor: "#b08068",
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#4a3f3a",
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: "#b08068",
  },
  filterTabInactive: {
    backgroundColor: "#f0e6de",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: "#ffffff",
  },
  filterTabTextInactive: {
    color: "#4a3f3a",
  },
  sortCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  taskCount: {
    fontSize: 12,
    color: "#8a7f78",
  },
  sortButton: {
    fontSize: 12,
    color: "#8a7f78",
  },
  smartInputContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  smartInputBar: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  smartInputIcon: {
    marginRight: 10,
  },
  smartInputText: {
    flex: 1,
    fontSize: 14,
    color: "#4a3f3a",
    padding: 0,
  },
  smartInputErrorText: {
    fontSize: 12,
    color: "#dc3545",
    marginTop: 6,
    marginLeft: 4,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#8a7f78",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  errorText: {
    color: "#dc3545",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#b08068",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4a3f3a",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8a7f78",
    marginTop: 4,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    padding: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#b08068",
    borderColor: "#b08068",
  },
  checkboxIncomplete: {
    borderColor: "#e2d9d0",
  },
  taskContent: {
    flex: 1,
    flexShrink: 1,
    marginLeft: 12,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginBottom: 4,
  },
  starIcon: {
    marginTop: 2,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    color: "#4a3f3a",
  },
  taskTitleCompleted: {
    color: "#8a7f78",
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  dueDate: {
    fontSize: 12,
    color: "#8a7f78",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});

const householdStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a3f3a",
    fontFamily: serifFont,
  },
  viewAll: {
    fontSize: 12,
    color: "#b08068",
    fontWeight: "500",
  },
  horizontalScroll: {
    gap: 8,
    paddingRight: 4,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  memberCardH: {
    width: 160,
    marginBottom: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: serifFont,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a3f3a",
    fontFamily: serifFont,
  },
  bar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2d9d0",
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 2,
  },
  memberStats: {
    fontSize: 11,
    color: "#8a7f78",
    fontFamily: serifFont,
  },
});
