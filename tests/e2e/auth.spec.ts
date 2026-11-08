import { expect, test } from "@playwright/test";
import { PASSWORD, login, mainNav } from "./helpers";

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/login\?next=%2Ftasks/);
  await expect(page.getByRole("img", { name: /MEM/ })).toBeVisible();
});

test("invalid login shows a clear error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("vikram@example.com");
  await page.getByLabel("Password").fill(`${PASSWORD}-wrong`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
  await expect(page).toHaveURL(/\/login/);
});

test("a deactivated employee cannot sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("former@example.com");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Your account is not active. Please contact your admin.");
});

test("admin sees company-wide navigation and dashboard", async ({ page }) => {
  await login(page, "admin@example.com");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Active employees", { exact: true })).toBeVisible();
  await expect(mainNav(page).getByRole("link", { name: "Employees" })).toBeVisible();
  await expect(mainNav(page).getByRole("link", { name: "Departments" })).toBeVisible();
});

test("employee sees only their own area and is blocked from admin pages", async ({ page }) => {
  await login(page, "vikram@example.com");
  await expect(page.getByRole("heading", { name: /Hello, Vikram/ })).toBeVisible();
  await expect(mainNav(page).getByRole("link", { name: "My Tasks" })).toBeVisible();
  await expect(mainNav(page).getByRole("link", { name: "Employees" })).toHaveCount(0);
  await expect(mainNav(page).getByRole("link", { name: "Departments" })).toHaveCount(0);

  for (const path of ["/employees", "/departments", "/employees/new", "/tasks/new"]) {
    await page.goto(path);
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByText("Kavita Demo")).toHaveCount(0);
  }
});

test("sign out ends the session", async ({ page }) => {
  await login(page, "vikram@example.com");
  await page.goto("/profile");
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("You have signed out.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
