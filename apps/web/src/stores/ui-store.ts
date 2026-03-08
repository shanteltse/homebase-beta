import { create } from "zustand";

type Notification = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
};

type UIState = {
  notifications: Notification[];
  sidebarOpen: boolean;
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  notifications: [],
  sidebarOpen: true,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: crypto.randomUUID() },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
