import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.SEED_USER_PASSWORD ?? "";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page) {
  await page.goto("/profile");
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** Main navigation (sidebar on desktop, bottom bar on mobile — whichever is visible). */
export function mainNav(page: Page) {
  return page.locator('nav[aria-label="Main"]:visible');
}
