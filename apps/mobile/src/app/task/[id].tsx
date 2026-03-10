import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTasks, useUpdateTask, useDeleteTask } from "../../hooks/use-tasks";
import { TaskDetailSkeleton } from "../../components/task-detail-skeleton";
import type { Task } from "@repo/shared/types/task";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: "#fce4e4", text: "#dc3545" },
  medium: { bg: "#fff3e0", text: "#e67e22" },
  low: { bg: "#e8f5e9", text: "#27ae60" },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const task = tasks?.find((t: Task) => t.id === id);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
    }
  }, [task?.id]);

  const handleToggleCompleted = () => {
    if (!task) return;
    const newCompleted = !task.completed;
    if (newCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateTask.mutate({
      id: task.id,
      completed: newCompleted,
      status: newCompleted ? "completed" : "active",
    });
  };

  const handleTitleBlur = () => {
    if (!task || title.trim() === "" || title === task.title) return;
    updateTask.mutate({ id: task.id, title: title.trim() });
  };

  const handleNotesBlur = () => {
    if (!task || notes === (task.notes ?? "")) return;
    updateTask.mutate({ id: task.id, notes });
  };

  const handleToggleStarred = useCallback(() => {
    if (!task) return;
    updateTask.mutate({ id: task.id, starred: !task.starred });
  }, [task, updateTask]);

  const handleToggleSubtask = useCallback(
    (subtaskId: string) => {
      if (!task || !task.subtasks) return;
      const updatedSubtasks = task.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      updateTask.mutate({ id: task.id, subtasks: updatedSubtasks });
    },
    [task, updateTask]
  );

  const handleAddSubtask = useCallback(() => {
    if (!task || newSubtaskTitle.trim() === "") return;
    const newSubtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updatedSubtasks = [...(task.subtasks ?? []), newSubtask];
    updateTask.mutate({ id: task.id, subtasks: updatedSubtasks });
    setNewSubtaskTitle("");
  }, [task, newSubtaskTitle, updateTask]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!task) return;
      const updatedTags = (task.tags ?? []).filter((t) => t !== tagToRemove);
      updateTask.mutate({ id: task.id, tags: updatedTags });
    },
    [task, updateTask]
  );

  const handleAddTag = useCallback(() => {
    if (!task || newTag.trim() === "") return;
    const trimmed = newTag.trim();
    if ((task.tags ?? []).includes(trimmed)) {
      setNewTag("");
      return;
    }
    const updatedTags = [...(task.tags ?? []), trimmed];
    updateTask.mutate({ id: task.id, tags: updatedTags });
    setNewTag("");
  }, [task, newTag, updateTask]);

  const handleDelete = () => {
    if (!task) return;
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTask.mutate(task.id, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#4a3f3a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <TaskDetailSkeleton />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Task not found</Text>
      </View>
    );
  }

  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#4a3f3a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <TouchableOpacity
          onPress={handleToggleStarred}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Ionicons
            name={task.starred ? "star" : "star-outline"}
            size={22}
            color={task.starred ? "#e8a838" : "#8a7f78"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={22} color="#dc3545" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Status Section */}
        <TouchableOpacity
          style={styles.statusSection}
          onPress={handleToggleCompleted}
          activeOpacity={0.7}
        >
          <Ionicons
            name={task.completed ? "checkbox" : "square-outline"}
            size={28}
            color={task.completed ? "#b08068" : "#8a7f78"}
          />
          <Text
            style={[
              styles.statusText,
              task.completed && styles.statusTextCompleted,
            ]}
          >
            {task.completed ? "Completed" : "Active"}
          </Text>
        </TouchableOpacity>

        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          onBlur={handleTitleBlur}
          placeholder="Task title"
          placeholderTextColor="#8a7f78"
        />

        {/* Info Cards */}
        <View style={styles.infoCard}>
          {/* Category */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{task.category}</Text>
          </View>

          <View style={styles.divider} />

          {/* Priority */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Priority</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColor.bg },
              ]}
            >
              <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Due Date */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{formatDate(task.dueDate)}</Text>
          </View>
        </View>

        {/* Notes Section */}
        <Text style={styles.sectionTitle}>Notes</Text>
        {task.notes || notes || showNotesInput ? (
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            placeholder="Add notes..."
            placeholderTextColor="#8a7f78"
            multiline
            textAlignVertical="top"
            autoFocus={showNotesInput && !task.notes && !notes}
          />
        ) : (
          <TouchableOpacity onPress={() => setShowNotesInput(true)}>
            <Text style={styles.addNotesText}>Add notes...</Text>
          </TouchableOpacity>
        )}

        {/* Subtasks Section */}
        <Text style={styles.sectionTitle}>Subtasks</Text>
        <View style={styles.subtasksList}>
          {(task.subtasks ?? []).map((subtask) => (
            <TouchableOpacity
              key={subtask.id}
              style={styles.subtaskRow}
              onPress={() => handleToggleSubtask(subtask.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={subtask.completed ? "checkbox" : "square-outline"}
                size={20}
                color={subtask.completed ? "#b08068" : "#8a7f78"}
              />
              <Text
                style={[
                  styles.subtaskTitle,
                  subtask.completed && styles.subtaskTitleCompleted,
                ]}
              >
                {subtask.title}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.addSubtaskRow}>
            <TextInput
              style={styles.addSubtaskInput}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add subtask..."
              placeholderTextColor="#8a7f78"
              onSubmitEditing={handleAddSubtask}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={handleAddSubtask} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={24} color="#b08068" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags Section */}
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tagsRow}>
          {(task.tags ?? []).map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(tag)}
                hitSlop={4}
              >
                <Ionicons name="close-circle" size={14} color="#b08068" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.addTagRow}>
          <TextInput
            style={styles.addTagInput}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Add tag..."
            placeholderTextColor="#8a7f78"
            onSubmitEditing={handleAddTag}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddTag} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={24} color="#b08068" />
          </TouchableOpacity>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#dc3545"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.deleteButtonText}>Delete Task</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f4",
  },
  centered: {
    flex: 1,
    backgroundColor: "#faf7f4",
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontFamily: serifFont,
    fontSize: 16,
    color: "#8a7f78",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#faf7f4",
    borderBottomWidth: 1,
    borderBottomColor: "#e2d9d0",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontFamily: serifFont,
    fontSize: 17,
    fontWeight: "600",
    color: "#4a3f3a",
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  statusText: {
    fontFamily: serifFont,
    fontSize: 16,
    color: "#4a3f3a",
    fontWeight: "500",
  },
  statusTextCompleted: {
    color: "#b08068",
  },
  titleInput: {
    fontFamily: serifFont,
    fontSize: 20,
    fontWeight: "600",
    color: "#4a3f3a",
    marginBottom: 20,
    padding: 0,
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
  infoLabel: {
    fontFamily: serifFont,
    fontSize: 14,
    color: "#8a7f78",
  },
  infoValue: {
    fontFamily: serifFont,
    fontSize: 14,
    color: "#4a3f3a",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2d9d0",
    marginHorizontal: 16,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontFamily: serifFont,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    fontFamily: serifFont,
    fontSize: 15,
    fontWeight: "600",
    color: "#4a3f3a",
    marginBottom: 10,
  },
  notesInput: {
    fontSize: 14,
    color: "#4a3f3a",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    padding: 12,
    minHeight: 80,
    marginBottom: 24,
    textAlignVertical: "top",
  },
  addNotesText: {
    fontSize: 14,
    color: "#8a7f78",
    marginBottom: 24,
  },
  emptyText: {
    fontFamily: serifFont,
    fontSize: 14,
    color: "#8a7f78",
    marginBottom: 24,
  },
  subtasksList: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    paddingVertical: 4,
    marginBottom: 24,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  subtaskTitle: {
    fontFamily: serifFont,
    fontSize: 14,
    color: "#4a3f3a",
    flex: 1,
  },
  subtaskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#8a7f78",
  },
  addSubtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2d9d0",
  },
  addSubtaskInput: {
    flex: 1,
    fontFamily: serifFont,
    fontSize: 14,
    color: "#4a3f3a",
    padding: 0,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0e8e2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontFamily: serifFont,
    fontSize: 13,
    color: "#b08068",
    fontWeight: "500",
  },
  addTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
    marginTop: 8,
  },
  addTagInput: {
    flex: 1,
    fontFamily: serifFont,
    fontSize: 14,
    color: "#4a3f3a",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dc3545",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  deleteButtonText: {
    fontFamily: serifFont,
    fontSize: 15,
    fontWeight: "600",
    color: "#dc3545",
  },
});
