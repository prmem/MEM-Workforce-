import { describe, expect, it } from "vitest";
import { isOverdue, nextStatusesForAssignee } from "./labels";

describe("assignee status moves (mirror of update_task_progress)", () => {
  it("matches the database workflow", () => {
    expect(nextStatusesForAssignee("to_do")).toEqual(["in_progress"]);
    expect(nextStatusesForAssignee("in_progress")).toEqual(["blocked", "submitted_for_review"]);
    expect(nextStatusesForAssignee("blocked")).toEqual(["in_progress"]);
    expect(nextStatusesForAssignee("reopened")).toEqual(["in_progress"]);
    expect(nextStatusesForAssignee("submitted_for_review")).toEqual([]);
    expect(nextStatusesForAssignee("completed")).toEqual([]);
    expect(nextStatusesForAssignee("cancelled")).toEqual([]);
  });
});

describe("isOverdue (computed, never stored)", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it("is overdue when the due time has passed and the task is open", () => {
    expect(isOverdue("2026-11-08T11:59:00Z", "in_progress", now)).toBe(true);
  });
  it("is not overdue when closed or not yet due or no due date", () => {
    expect(isOverdue("2026-11-01T00:00:00Z", "completed", now)).toBe(false);
    expect(isOverdue("2026-11-01T00:00:00Z", "cancelled", now)).toBe(false);
    expect(isOverdue("2026-11-09T00:00:00Z", "to_do", now)).toBe(false);
    expect(isOverdue(null, "to_do", now)).toBe(false);
  });
});
