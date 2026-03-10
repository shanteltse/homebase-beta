import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useCreateTask } from "../../hooks/use-tasks";
import type { TaskPriority } from "@repo/shared/types/task";

const CATEGORIES = ["Home", "Personal", "Work"];
const PRIORITIES: { label: string; value: TaskPriority }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  high: { bg: "rgba(220,53,69,0.15)", text: "#dc3545", border: "#dc3545" },
  medium: { bg: "rgba(232,168,56,0.15)", text: "#e8a838", border: "#e8a838" },
  low: { bg: "rgba(124,154,142,0.15)", text: "#7c9a8e", border: "#7c9a8e" },
};

const serifFont = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });

export default function CreateTaskScreen() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [showDateInput, setShowDateInput] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const createTask = useCreateTask();

  const handleCreate = () => {
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }

    const input: Parameters<typeof createTask.mutate>[0] = {
      title: title.trim(),
      category: category.toLowerCase(),
      priority,
      notes: notes.trim() || undefined,
      dueDate: dueDate.trim() ? new Date(dueDate.trim()).toISOString() : undefined,
    };

    createTask.mutate(input, {
      onSuccess: () => {
        router.back();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to create task.");
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Task</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What needs to be done?"
            placeholderTextColor="#8a7f78"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected ? styles.chipTextSelected : styles.chipTextUnselected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => {
              const selected = priority === p.value;
              const colors = PRIORITY_COLORS[p.value];
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.chip,
                    selected
                      ? { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }
                      : styles.chipUnselected,
                  ]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected ? { color: colors.text } : styles.chipTextUnselected,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Due Date</Text>
          {showDateInput ? (
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8a7f78"
              value={dueDate}
              onChangeText={setDueDate}
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
          ) : (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDateInput(true)}
            >
              <Text style={dueDate ? styles.dateText : styles.datePlaceholder}>
                {dueDate || "No due date"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Add notes..."
            placeholderTextColor="#8a7f78"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, createTask.isPending && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={createTask.isPending}
        >
          {createTask.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.createButtonText}>Create Task</Text>
          )}
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === "ios" ? 60 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2d9d0",
    backgroundColor: "#ffffff",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#4a3f3a",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: serifFont,
    color: "#4a3f3a",
    fontWeight: "600",
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8a7f78",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#4a3f3a",
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: "#b08068",
  },
  chipUnselected: {
    backgroundColor: "#f0e6de",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  chipTextUnselected: {
    color: "#4a3f3a",
  },
  dateButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2d9d0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: "#4a3f3a",
  },
  datePlaceholder: {
    fontSize: 16,
    color: "#8a7f78",
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: "#e2d9d0",
    backgroundColor: "#ffffff",
  },
  createButton: {
    backgroundColor: "#b08068",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
});
