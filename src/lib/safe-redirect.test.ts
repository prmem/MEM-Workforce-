import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath (open-redirect protection)", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/tasks/123")).toBe("/tasks/123");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/ok\r\nSet-Cookie: x=1", 42, null])(
    "rejects %s",
    (v) => {
      expect(safeNextPath(v)).toBe("/dashboard");
    },
  );
});
