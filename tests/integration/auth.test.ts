import { describe, expect, it } from "vitest";
import { USERS, anonClient, password, serviceClient } from "./helpers";

describe("login", () => {
  it("an active employee can sign in", async () => {
    const { data, error } = await anonClient().auth.signInWithPassword({ email: USERS.vikram, password });
    expect(error).toBeNull();
    expect(data.user?.email).toBe(USERS.vikram);
  });

  it("a wrong password is rejected", async () => {
    const { data, error } = await anonClient().auth.signInWithPassword({ email: USERS.vikram, password: `${password}x` });
    expect(error?.code).toBe("invalid_credentials");
    expect(data.session).toBeNull();
  });

  it("an unknown email gets the same error as a wrong password", async () => {
    const { error } = await anonClient().auth.signInWithPassword({ email: "nobody@example.com", password });
    expect(error?.code).toBe("invalid_credentials");
  });

  it("a deactivated employee cannot sign in", async () => {
    const { data, error } = await anonClient().auth.signInWithPassword({ email: USERS.former, password });
    expect(error?.code).toBe("user_banned");
    expect(data.session).toBeNull();
  });

  it("public self sign-up is disabled (admin invitations only)", async () => {
    const { data, error } = await anonClient().auth.signUp({ email: `self-${Date.now()}@example.com`, password: "selfsignup123" });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});

describe("admin invitation flow", () => {
  it("invite email links to /auth/confirm, the token signs the user in, and the profile is linked", async () => {
    const email = `invite-${Date.now()}@example.com`;
    const service = serviceClient();
    const { data: profile, error: pErr } = await service
      .from("profiles")
      .insert({ employee_code: `INV-${Date.now() % 100000}`, full_name: "Invite Test Demo", work_email: email })
      .select("id")
      .single();
    expect(pErr).toBeNull();

    const { error: invErr } = await service.auth.admin.inviteUserByEmail(email);
    expect(invErr).toBeNull();

    // The local email catcher (Mailpit) receives the invite.
    let html = "";
    for (let i = 0; i < 20 && !html; i++) {
      const list = (await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as {
        messages: { ID: string }[];
      };
      if (list.messages?.length) {
        const msg = (await (await fetch(`http://127.0.0.1:54324/api/v1/message/${list.messages[0].ID}`)).json()) as { HTML: string };
        html = msg.HTML;
      } else {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    expect(html).toContain("/auth/confirm?token_hash=");
    const tokenHash = /token_hash=([^&"]+)/.exec(html)?.[1];
    expect(tokenHash).toBeTruthy();

    const { data: linked } = await service.from("profiles").select("user_id").eq("id", profile!.id).single();
    expect(linked?.user_id).toBeTruthy();

    const client = anonClient();
    const { data: verified, error: vErr } = await client.auth.verifyOtp({ type: "invite", token_hash: decodeURIComponent(tokenHash!) });
    expect(vErr).toBeNull();
    expect(verified.user?.id).toBe(linked?.user_id);

    const { error: setErr } = await client.auth.updateUser({ password: "NewStaff2026" });
    expect(setErr).toBeNull();
    const { error: loginErr } = await anonClient().auth.signInWithPassword({ email, password: "NewStaff2026" });
    expect(loginErr).toBeNull();

    // The one-time token cannot be reused.
    const { error: reuseErr } = await anonClient().auth.verifyOtp({ type: "invite", token_hash: decodeURIComponent(tokenHash!) });
    expect(reuseErr).not.toBeNull();
  });
});
