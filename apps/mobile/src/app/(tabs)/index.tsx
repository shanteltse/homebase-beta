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
import { router } from "expo-router";
import { useTasks, useUpdateTask } from "../../hooks/use-tasks";
import type { Task } from "@repo/shared/types/task";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

type FilterTab = "all" | "active" | "completed";

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

function TaskItem({ task }: { task: Task }) {
  const priority = priorityStyles[task.priority] ?? priorityStyles.low;
  const category =
    task.category ? categoryStyles[task.category.toLowerCase()] : null;
  const updateTask = useUpdateTask();

  const handleToggleComplete = useCallback(() => {
    const isCompleted = task.status === "completed";
    updateTask.mutate({
      id: task.id,
      status: isCompleted ? "active" : "completed",
      completed: !isCompleted,
    });
  }, [task.id, task.status, updateTask]);

  return (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => router.push(`/task/${task.id}`)}
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
        <Text
          style={[
            styles.taskTitle,
            task.status === "completed" && styles.taskTitleCompleted,
          ]}
        >
          {task.title}
        </Text>
        {task.dueDate ? (
          <Text style={styles.dueDate}>
            Due {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        ) : null}
      </View>
      <View style={styles.badges}>
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
      </View>
    </TouchableOpacity>
  );
}

function sortTasks(tasks: Task[]): Task[] {
  const active = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  const completed = tasks
    .filter((t) => t.status === "completed")
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  return [...active, ...completed];
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

export default function TasksScreen() {
  const { data: tasks, isLoading, refetch } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredTasks = sortTasks(
    (tasks ?? []).filter((task) => {
      if (activeFilter === "active") return task.status !== "completed";
      if (activeFilter === "completed") return task.status === "completed";
      return true;
    })
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HomeBase</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/create-task")}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
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

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskItem task={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#b08068"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done" size={48} color="#e2d9d0" />
              <Text style={styles.emptyText}>No tasks yet</Text>
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
  addButton: {
    backgroundColor: "#b08068",
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#8a7f78",
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
    marginRight: 12,
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
  },
  taskTitle: {
    fontSize: 15,
    color: "#4a3f3a",
  },
  taskTitleCompleted: {
    color: "#8a7f78",
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  dueDate: {
    fontSize: 12,
    color: "#8a7f78",
    marginTop: 4,
  },
  badges: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
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
