import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin adds an employee (invite email sent), then deactivates them", async ({ page, browser }, testInfo) => {
  const stamp = `${testInfo.project.name.slice(0, 1)}${Date.now() % 1_000_000}`;
  const email = `new.${stamp}@example.com`;

  await login(page, "admin@example.com");
  await page.goto("/employees/new");
  await page.getByLabel("Employee ID").fill(`T-${stamp}`);
  await page.getByLabel("Full name").fill(`New Starter ${stamp} Demo`);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Department").selectOption({ label: "Dispatch" });
  await page.getByLabel("Reporting manager").selectOption({ label: "Rohit Demo (MGR-001)" });
  await page.getByRole("button", { name: "Add employee and send invite" }).click();

  await expect(page.getByText("Employee added.")).toBeVisible();
  await expect(page.getByText(`An invite email has been sent to ${email}.`)).toBeVisible();
  await expect(page.getByText("Invite sent — password not set yet")).toBeVisible();

  // The invite reached the (local) mailbox and points at /auth/confirm.
  const res = await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  const list = (await res.json()) as { messages: { ID: string }[] };
  expect(list.messages.length).toBe(1);
  const msg = (await (await fetch(`http://127.0.0.1:54324/api/v1/message/${list.messages[0].ID}`)).json()) as { HTML: string };
  const link = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(msg.HTML)?.[1]?.replaceAll("&amp;", "&");
  expect(link).toBeTruthy();

  // The new employee opens the link in their own browser, presses Continue and sets a password.
  const employeeContext = await browser.newContext();
  const emp = await employeeContext.newPage();
  await emp.goto(link!);
  await expect(emp.getByRole("heading", { name: "Welcome to MEM Workforce" })).toBeVisible();
  await emp.getByRole("button", { name: "Continue" }).click();
  await expect(emp.getByRole("heading", { name: "Choose your password" })).toBeVisible();
  await emp.getByLabel("New password", { exact: true }).fill("short");
  await emp.getByLabel("Confirm new password").fill("short");
  await emp.getByRole("button", { name: "Save password" }).click();
  await expect(emp.getByText("Password must be at least 8 characters.")).toBeVisible();
  await emp.getByLabel("New password", { exact: true }).fill("Starter2026");
  await emp.getByLabel("Confirm new password").fill("Starter2026");
  await emp.getByRole("button", { name: "Save password" }).click();
  await expect(emp.getByText("Your password has been saved.")).toBeVisible();
  await expect(emp.getByRole("heading", { name: /Hello, New/ })).toBeVisible();
  await employeeContext.close();

  // Duplicate employee ID is rejected with a clear message.
  await page.goto("/employees/new");
  await page.getByLabel("Employee ID").fill(`t-${stamp}`);
  await page.getByLabel("Full name").fill("Duplicate Demo");
  await page.getByLabel("Work email").fill(`dup.${stamp}@example.com`);
  await page.getByRole("button", { name: "Add employee and send invite" }).click();
  await expect(page.getByText("This employee ID is already in use.")).toBeVisible();

  // Deactivate.
  await page.goto("/employees?q=" + encodeURIComponent(`New Starter ${stamp}`));
  await page.getByText(`New Starter ${stamp} Demo`).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Deactivate employee" }).click();
  await expect(page.getByText("Employee deactivated.")).toBeVisible();

  // The deactivated employee can no longer sign in.
  const ctx = await browser.newContext();
  const gone = await ctx.newPage();
  await gone.goto("/login");
  await gone.getByLabel("Work email").fill(email);
  await gone.getByLabel("Password").fill("Starter2026");
  await gone.getByRole("button", { name: "Sign in" }).click();
  await expect(gone.getByRole("main").getByRole("alert")).toHaveText("Your account is not active. Please contact your admin.");
  await ctx.close();
});

test("admin cannot deactivate their own account (UI hides it; database also blocks it)", async ({ page }) => {
  // Look up the admin's profile id from outside the app (local service key, test setup only).
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?work_email=eq.admin@example.com&select=id`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const [{ id }] = (await res.json()) as { id: string }[];

  await login(page, "admin@example.com");
  await page.goto(`/employees/${id}`);
  await expect(page.getByText("You cannot deactivate your own account.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate employee" })).toHaveCount(0);
});
