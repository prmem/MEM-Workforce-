import { describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR, friendlyDbError } from "./errors";

describe("friendlyDbError", () => {
  it("passes through our database messages", () => {
    expect(friendlyDbError({ code: "P0001", message: "This status change is not allowed." }, "t")).toBe("This status change is not allowed.");
  });
  it("hides raw RLS / permission errors", () => {
    expect(friendlyDbError({ code: "42501", message: 'new row violates row-level security policy for table "profiles"' }, "t")).toBe(
      "You are not allowed to do this.",
    );
    expect(friendlyDbError({ code: "42501", message: "permission denied for table tasks" }, "t")).toBe("You are not allowed to do this.");
  });
  it("maps unique violations by constraint", () => {
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "profiles_employee_code_unique"' }, "t")).toBe(
      "This employee ID is already in use.",
    );
  });
  it("logs unknown errors (never silent) and shows a generic message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(friendlyDbError({ code: "XX000", message: "boom" }, "ctx")).toBe(GENERIC_ERROR);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
