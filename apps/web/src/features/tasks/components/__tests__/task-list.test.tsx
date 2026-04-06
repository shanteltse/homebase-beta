import { describe, it, expect } from "vitest";
import { renderApp, screen, waitFor } from "@/testing/test-utils";
import { TaskList } from "../task-list";

describe("TaskList", () => {
  it("renders loading spinner initially", () => {
    renderApp(<TaskList />);
    expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("renders task cards after loading", async () => {
    renderApp(<TaskList />);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    });

    expect(screen.getByText("Schedule dentist")).toBeInTheDocument();
  });

  it("does not show completed tasks in default view", async () => {
    renderApp(<TaskList />);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    });

    expect(screen.queryByText("Completed task")).not.toBeInTheDocument();
  });

  it("renders filter buttons", async () => {
    renderApp(<TaskList />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
