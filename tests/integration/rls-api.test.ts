import { describe, expect, it } from "vitest";
import { USERS, anonClient, profileId, serviceClient, signedIn } from "./helpers";

describe("anonymous access through the API", () => {
  it("cannot read profiles, departments or tasks", async () => {
    const anon = anonClient();
    for (const table of ["profiles", "departments", "tasks", "task_updates", "audit_logs"] as const) {
      const { data, error } = await anon.from(table).select("*");
      expect(error?.code, table).toBe("42501");
      expect(data, table).toBeNull();
    }
  });
});

describe("employee data isolation", () => {
  it("an employee sees only their own profile and tasks", async () => {
    const vikram = await signedIn(USERS.vikram);
    const me = await profileId(USERS.vikram);

    const { data: profiles, error } = await vikram.from("profiles").select("id, work_email, phone");
    expect(error).toBeNull();
    expect(profiles?.map((p) => p.id)).toEqual([me]);

    const { data: tasks } = await vikram.from("tasks").select("assigned_to");
    expect(tasks?.length).toBeGreaterThan(0);
    expect(tasks?.every((t) => t.assigned_to === me)).toBe(true);
  });

  it("colleague names never include contact details", async () => {
    const vikram = await signedIn(USERS.vikram);
    const { data, error } = await vikram.rpc("colleague_names");
    expect(error).toBeNull();
    expect(Object.keys(data![0]).sort()).toEqual(["department_id", "designation", "full_name", "id"]);
    expect(JSON.stringify(data)).not.toContain("@example.com");
  });
});

describe("role escalation attempts", () => {
  it("an employee cannot make themselves admin", async () => {
    const vikram = await signedIn(USERS.vikram);
    const me = await profileId(USERS.vikram);
    const { data } = await vikram.from("profiles").update({ role: "admin" }).eq("id", me).select("id");
    expect(data ?? []).toEqual([]);
    const { data: check } = await serviceClient().from("profiles").select("role").eq("id", me).single();
    expect(check?.role).toBe("employee");
  });

  it("an employee cannot change their reporting manager or department", async () => {
    const vikram = await signedIn(USERS.vikram);
    const me = await profileId(USERS.vikram);
    const salesMgr = await profileId(USERS.managerSales);
    const { data } = await vikram.from("profiles").update({ reporting_manager_id: salesMgr }).eq("id", me).select("id");
    expect(data ?? []).toEqual([]);
  });

  it("an employee cannot create tasks, even for themselves", async () => {
    const vikram = await signedIn(USERS.vikram);
    const { error } = await vikram.rpc("create_task", { p_title: "Self-assigned", p_assigned_to: await profileId(USERS.vikram) });
    expect(error?.code).toBe("42501");
  });

  it("a manager cannot edit employee profiles", async () => {
    const mgr = await signedIn(USERS.managerProduction);
    const target = await profileId(USERS.vikram);
    const { data } = await mgr.from("profiles").update({ designation: "Hacked" }).eq("id", target).select("id");
    expect(data ?? []).toEqual([]);
  });
});

describe("manager team limits", () => {
  it("a manager sees only themselves and direct reports", async () => {
    const mgr = await signedIn(USERS.managerProduction);
    const { data } = await mgr.from("profiles").select("work_email");
    const emails = (data ?? []).map((p) => p.work_email).sort();
    expect(emails).toContain(USERS.vikram);
    expect(emails).toContain(USERS.kavita);
    expect(emails).not.toContain(USERS.meena);
    expect(emails).not.toContain(USERS.managerSales);
    expect(emails).not.toContain(USERS.admin);
  });

  it("a manager cannot assign a task outside their team", async () => {
    const mgr = await signedIn(USERS.managerProduction);
    const { error } = await mgr.rpc("create_task", { p_title: "Not my team", p_assigned_to: await profileId(USERS.meena) });
    expect(error?.code).toBe("42501");
    expect(error?.message).toBe("You can only assign tasks to members of your own team.");
  });

  it("a manager cannot see another team's tasks", async () => {
    const mgr = await signedIn(USERS.managerProduction);
    const meena = await profileId(USERS.meena);
    const { data } = await mgr.from("tasks").select("id").eq("assigned_to", meena);
    expect(data).toEqual([]);
  });
});

describe("task flow through the API", () => {
  it("create → start → submit → reopen → resubmit → approve", async () => {
    const mgr = await signedIn(USERS.managerProduction);
    const vikram = await signedIn(USERS.vikram);
    const kavita = await signedIn(USERS.kavita);

    const { data: taskId, error: cErr } = await mgr.rpc("create_task", {
      p_title: `API flow ${Date.now()}`,
      p_assigned_to: await profileId(USERS.vikram),
      p_priority: "high",
      p_target_quantity: 100,
      p_unit: "pcs",
    });
    expect(cErr).toBeNull();

    // A colleague in the same team cannot see or touch it.
    const { data: hidden } = await kavita.from("tasks").select("id").eq("id", taskId!);
    expect(hidden).toEqual([]);
    expect((await kavita.rpc("update_task_progress", { p_task_id: taskId!, p_new_status: "in_progress" })).error?.code).toBe("42501");

    // The assignee cannot approve their own work or skip steps.
    expect((await vikram.rpc("update_task_progress", { p_task_id: taskId!, p_new_status: "completed" })).error?.code).toBe("P0001");
    expect((await vikram.rpc("review_task", { p_task_id: taskId!, p_decision: "approve" })).error?.code).toBe("42501");

    expect((await vikram.rpc("update_task_progress", { p_task_id: taskId!, p_new_status: "in_progress" })).error).toBeNull();
    expect((await vikram.rpc("update_task_progress", { p_task_id: taskId!, p_completed_quantity: -1 })).error?.message).toBe("Quantity cannot be negative.");
    expect((await vikram.rpc("update_task_progress", { p_task_id: taskId!, p_completed_quantity: 100, p_new_status: "submitted_for_review", p_note: "Done" })).error).toBeNull();

    expect((await mgr.rpc("review_task", { p_task_id: taskId!, p_decision: "reopen", p_note: "Recount please" })).error).toBeNull();
    expect((await vikram.rpc("update_task_progress", { p_task_id: taskId!, p_new_status: "in_progress" })).error).toBeNull();
    expect((await vikram.rpc("update_task_progress", { p_task_id: taskId!, p_new_status: "submitted_for_review", p_note: "Recounted" })).error).toBeNull();
    expect((await mgr.rpc("review_task", { p_task_id: taskId!, p_decision: "approve" })).error).toBeNull();

    const { data: task } = await vikram.from("tasks").select("status, completed_at, completed_quantity").eq("id", taskId!).single();
    expect(task?.status).toBe("completed");
    expect(task?.completed_at).toBeTruthy();
    expect(task?.completed_quantity).toBe(100);

    const { data: history } = await vikram.from("task_updates").select("kind").eq("task_id", taskId!);
    expect(history?.length).toBe(7);
  });
});
