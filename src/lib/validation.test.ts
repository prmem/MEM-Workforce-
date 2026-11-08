import { describe, expect, it } from "vitest";
import { emailSchema, loginSchema, newPasswordSchema } from "./validation";

describe("validation", () => {
  it("normalises email to lower case", () => {
    expect(emailSchema.parse("  Admin@Example.COM ")).toBe("admin@example.com");
  });
  it("rejects invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
  it("requires a password to sign in", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "" }).success).toBe(false);
  });
  it("enforces the password rule (8+, letters and numbers) and matching confirm", () => {
    expect(newPasswordSchema.safeParse({ password: "short1", confirm: "short1" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "lettersonly", confirm: "lettersonly" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "12345678", confirm: "12345678" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "factory123", confirm: "factory124" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "factory123", confirm: "factory123" }).success).toBe(true);
  });
});
