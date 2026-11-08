import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test("manager sees only their direct reports", async ({ page }) => {
  await login(page, "manager.production@example.com");
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "My Team" })).toBeVisible();
  await expect(page.getByText("Vikram Demo")).toBeVisible();
  await expect(page.getByText("Kavita Demo")).toBeVisible();
  await expect(page.getByText("Meena Demo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add employee" })).toHaveCount(0);

  await page.goto("/tasks/new");
  const options = await page.getByLabel("Assign to").locator("option").allTextContents();
  expect(options.join("|")).toContain("Vikram Demo");
  expect(options.join("|")).not.toContain("Meena Demo");
});

test("full task flow: manager assigns, employee works and submits, manager reopens then approves", async ({ page }, testInfo) => {
  const title = `E2E batch ${testInfo.project.name} ${Date.now()}`;

  // Manager creates and assigns the task.
  await login(page, "manager.production@example.com");
  await page.goto("/tasks/new");
  await page.getByLabel("Task title").fill(title);
  await page.getByLabel("Assign to").selectOption({ label: "Vikram Demo (EMP-001)" });
  await page.getByLabel("Priority").selectOption("high");
  await page.getByLabel("Target quantity (optional)").fill("50");
  await page.getByLabel("Unit (optional)").fill("pcs");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("Task created and assigned.")).toBeVisible();
  const taskUrl = page.url();
  await logout(page);

  // Employee starts work, records progress and submits.
  await login(page, "vikram@example.com");
  await page.goto("/tasks");
  await page.getByText(title).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByLabel("Change status").selectOption("in_progress");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(page.getByText("Update saved.")).toBeVisible();
  await page.getByLabel("Change status").selectOption("submitted_for_review");
  await page.getByLabel(/Quantity done so far/).fill("50");
  await page.getByLabel("Note").fill("All 50 pieces done.");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(page.getByText("Submitted for review. Your manager will approve it or send it back.")).toBeVisible();
  await expect(page.getByText("Waiting for your manager to review this task.")).toBeVisible();
  await logout(page);

  // Manager reopens with a reason.
  await login(page, "manager.production@example.com");
  await page.goto(taskUrl);
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.getByText("Please give a reason for reopening the task.")).toBeVisible();
  await page.getByLabel("Review note").fill("Please recount.");
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.getByText("Task reopened. The employee can continue working on it.")).toBeVisible();
  await logout(page);

  // Employee resubmits.
  await login(page, "vikram@example.com");
  await page.goto(taskUrl);
  await page.getByLabel("Change status").selectOption("in_progress");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(page.getByText("Update saved.")).toBeVisible();
  await page.getByLabel("Change status").selectOption("submitted_for_review");
  await page.getByLabel("Note").fill("Recounted: 50.");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(page.getByText("Submitted for review. Your manager will approve it or send it back.")).toBeVisible();
  await logout(page);

  // Manager approves.
  await login(page, "manager.production@example.com");
  await page.goto(taskUrl);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Task approved and marked Completed.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("This task is completed and can no longer be changed.")).toBeVisible();
  await expect(page.getByText("Reviewed: Submitted for Review → Completed")).toBeVisible();
});

test("admin can add a department", async ({ page }, testInfo) => {
  const name = `E2E Dept ${testInfo.project.name} ${Date.now() % 100000}`;
  await login(page, "admin@example.com");
  await page.goto("/departments");
  await page.locator("#new-name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(`Department "${name}" added.`)).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
});
