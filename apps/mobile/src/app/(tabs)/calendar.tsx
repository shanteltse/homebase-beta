import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTasks, useUpdateTask } from "../../hooks/use-tasks";
import type { Task } from "@repo/shared/types/task";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const PRIORITY_COLORS: Record<string, string> = {
  high: "#dc3545",
  medium: "#e8a838",
  low: "#7c9a8e",
  urgent: "#dc3545",
};

const priorityBadgeStyles: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  high: { backgroundColor: "rgba(220,53,69,0.1)", color: "#dc3545" },
  medium: { backgroundColor: "rgba(232,168,56,0.1)", color: "#e8a838" },
  low: { backgroundColor: "rgba(124,154,142,0.1)", color: "#7c9a8e" },
  urgent: { backgroundColor: "rgba(220,53,69,0.15)", color: "#dc3545" },
};

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

function getCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month fill
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month fill to complete 6 rows (42 cells)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
    });
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getWeekDays(referenceDate: Date): CalendarDay[] {
  const dow = referenceDate.getDay(); // 0=Sun
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - dow);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({ date: d, isCurrentMonth: true });
  }
  return days;
}

function formatWeekRange(referenceDate: Date): string {
  const dow = referenceDate.getDay();
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - dow);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} \u2013 ${endStr}`;
}

function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    return isSameDay(due, date);
  });
}

function TaskItem({ task }: { task: Task }) {
  const priority = priorityBadgeStyles[task.priority] ?? priorityBadgeStyles.low;
  const updateTask = useUpdateTask();

  const handleToggleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      </View>
      <View
        style={[
          styles.priorityBadge,
          { backgroundColor: priority.backgroundColor },
        ]}
      >
        <Text style={[styles.priorityText, { color: priority.color }]}>
          {task.priority}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const { data: tasks, isLoading } = useTasks();

  const allTasks = tasks ?? [];

  const calendarDays = useMemo(
    () => getCalendarGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(allTasks, selectedDate);
  }, [selectedDate, allTasks]);

  const tasksByDateKeyForWeek = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of allTasks) {
      if (!task.dueDate) continue;
      const due = new Date(task.dueDate);
      const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
      const existing = map.get(key) ?? [];
      existing.push(task);
      map.set(key, existing);
    }
    return map;
  }, [allTasks]);

  const goToPrevMonth = useCallback(() => {
    if (viewMode === "week") {
      setWeekAnchor((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentMonth(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      );
    }
  }, [viewMode]);

  const goToNextMonth = useCallback(() => {
    if (viewMode === "week") {
      setWeekAnchor((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentMonth(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      );
    }
  }, [viewMode]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setWeekAnchor(now);
    setSelectedDate(now);
  }, []);

  // Stable refs so panResponder doesn't need to be recreated on each render
  const goToPrevRef = useRef(goToPrevMonth);
  const goToNextRef = useRef(goToNextMonth);
  const viewModeRef = useRef(viewMode);
  useEffect(() => { goToPrevRef.current = goToPrevMonth; }, [goToPrevMonth]);
  useEffect(() => { goToNextRef.current = goToNextMonth; }, [goToNextMonth]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 || Math.abs(dy) > 10;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > 50 && absDx >= absDy) {
          // Horizontal swipe — both views
          if (dx < 0) goToNextRef.current(); // swipe left → next
          else goToPrevRef.current();         // swipe right → prev
        } else if (
          absDy > 50 &&
          absDy > absDx &&
          viewModeRef.current === "week"
        ) {
          // Vertical swipe — week view only
          if (dy < 0) goToNextRef.current(); // swipe up → next week
          else goToPrevRef.current();         // swipe down → prev week
        }
      },
    })
  ).current;

  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // Build a map of date-string -> task priorities for dot rendering
  const tasksByDateKey = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const task of allTasks) {
      if (!task.dueDate) continue;
      const due = new Date(task.dueDate);
      const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
      const existing = map.get(key) ?? [];
      existing.push(task.priority);
      map.set(key, existing);
    }
    return map;
  }, [allTasks]);

  const rows: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    rows.push(calendarDays.slice(i, i + 7));
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color="#4a3f3a" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>
            {viewMode === "week"
              ? formatWeekRange(weekAnchor)
              : formatMonthYear(currentMonth)}
          </Text>
          {isLoading && (
            <View style={styles.headerSpinner}>
              <View style={styles.loadingDot} />
            </View>
          )}
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={22} color="#4a3f3a" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* View mode toggle */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[
            styles.viewTogglePill,
            viewMode === "month"
              ? styles.viewTogglePillActive
              : styles.viewTogglePillInactive,
          ]}
          onPress={() => setViewMode("month")}
        >
          <Text
            style={[
              styles.viewToggleText,
              viewMode === "month"
                ? styles.viewToggleTextActive
                : styles.viewToggleTextInactive,
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewTogglePill,
            viewMode === "week"
              ? styles.viewTogglePillActive
              : styles.viewTogglePillInactive,
          ]}
          onPress={() => setViewMode("week")}
        >
          <Text
            style={[
              styles.viewToggleText,
              viewMode === "week"
                ? styles.viewToggleTextActive
                : styles.viewToggleTextInactive,
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
      </View>

      {/* Weekday header */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Month view */}
      {viewMode === "month" && (
        <View style={styles.calendarGrid} {...panResponder.panHandlers}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.calendarRow}>
              {row.map((day, colIndex) => {
                const isToday = isSameDay(day.date, today);
                const isSelected =
                  selectedDate != null && isSameDay(day.date, selectedDate);
                const dateKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
                const dayPriorities = tasksByDateKey.get(dateKey) ?? [];

                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      !day.isCurrentMonth && styles.dayCellOutside,
                    ]}
                    onPress={() => handleDayPress(day.date)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.dayNumberContainer}>
                      {isToday ? (
                        <View style={styles.todayCircle}>
                          <Text style={styles.todayNumber}>
                            {day.date.getDate()}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.dayNumber}>
                          {day.date.getDate()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.dotsRow}>
                      {dayPriorities.slice(0, 2).map((priority, di) => (
                        <View
                          key={di}
                          style={[
                            styles.dot,
                            {
                              backgroundColor:
                                PRIORITY_COLORS[priority] ?? "#7c9a8e",
                            },
                          ]}
                        />
                      ))}
                      {dayPriorities.length > 2 && (
                        <Text style={styles.moreText}>
                          +{dayPriorities.length - 2}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Week view */}
      {viewMode === "week" && (
        <View style={styles.calendarGrid} {...panResponder.panHandlers}>
          <View style={styles.calendarRow}>
            {weekDays.map((day, colIndex) => {
              const isToday = isSameDay(day.date, today);
              const isSelected =
                selectedDate != null && isSameDay(day.date, selectedDate);
              const dateKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
              const dayTasks = tasksByDateKeyForWeek.get(dateKey) ?? [];

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.weekDayCell,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => handleDayPress(day.date)}
                  activeOpacity={0.6}
                >
                  <View style={styles.dayNumberContainer}>
                    {isToday ? (
                      <View style={styles.todayCircle}>
                        <Text style={styles.todayNumber}>
                          {day.date.getDate()}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.dayNumber}>
                        {day.date.getDate()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.weekTaskList}>
                    {dayTasks.slice(0, 3).map((task) => (
                      <View key={task.id} style={styles.weekTaskCard}>
                        <Text
                          style={styles.weekTaskCardText}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                      </View>
                    ))}
                    {dayTasks.length > 3 && (
                      <Text style={styles.weekTaskMore}>
                        +{dayTasks.length - 3} more
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Selected day tasks */}
      {selectedDate != null && (
        <View style={styles.taskListContainer}>
          <Text style={styles.taskListTitle}>
            {isSameDay(selectedDate, today)
              ? "Today"
              : selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
          </Text>
          {selectedDayTasks.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayText}>No tasks for this day</Text>
            </View>
          ) : (
            <FlatList
              data={selectedDayTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TaskItem task={item} />}
              contentContainerStyle={styles.taskListContent}
            />
          )}
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    padding: 6,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: serifFont,
    color: "#4a3f3a",
    textAlign: "center",
  },
  headerSpinner: {
    marginLeft: 8,
    justifyContent: "center",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#b08068",
    opacity: 0.6,
  },
  todayButton: {
    backgroundColor: "#f0e6de",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#b08068",
  },
  viewToggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 8,
  },
  viewTogglePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  viewTogglePillActive: {
    backgroundColor: "#b08068",
  },
  viewTogglePillInactive: {
    backgroundColor: "#f0e6de",
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewToggleTextActive: {
    color: "#ffffff",
  },
  viewToggleTextInactive: {
    color: "#4a3f3a",
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8a7f78",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  calendarGrid: {
    paddingHorizontal: 4,
  },
  calendarRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#e2d9d0",
    paddingTop: 4,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  dayCellSelected: {
    backgroundColor: "rgba(176,128,104,0.08)",
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayNumberContainer: {
    alignItems: "center",
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 13,
    color: "#4a3f3a",
  },
  todayCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#b08068",
    alignItems: "center",
    justifyContent: "center",
  },
  todayNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#ffffff",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  moreText: {
    fontSize: 8,
    color: "#8a7f78",
    fontWeight: "600",
  },
  weekDayCell: {
    flex: 1,
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: "#e2d9d0",
    paddingTop: 4,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  weekTaskList: {
    width: "100%",
    paddingHorizontal: 1,
    marginTop: 2,
  },
  weekTaskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2d9d0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  weekTaskCardText: {
    fontSize: 12,
    color: "#4a3f3a",
  },
  weekTaskMore: {
    fontSize: 10,
    color: "#8a7f78",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 1,
  },
  taskListContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#e2d9d0",
    marginTop: 4,
  },
  taskListTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: serifFont,
    color: "#4a3f3a",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  taskListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyDay: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyDayText: {
    color: "#8a7f78",
    fontSize: 14,
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
});
