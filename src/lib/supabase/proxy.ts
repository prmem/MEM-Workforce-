import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabasePublicEnv } from "@/lib/env";

// Pages that do not require a signed-in user.
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/confirm"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Refreshes the Supabase session cookie and redirects signed-out users to /login. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabasePublicEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getUser() validates the session with Supabase Auth (not just the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && !isPublic(pathname)) {
    // Build the login URL from the public host when behind a proxy (request.nextUrl carries
    // the internal host, e.g. localhost:3000). Path is fixed, so this cannot redirect off-site
    // for anyone but the sender of the headers; the response is never cached.
    const loginUrl = request.nextUrl.clone();
    const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const fwdProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (fwdHost && /^[A-Za-z0-9.-]+(:\d+)?$/.test(fwdHost)) {
      const [hostname, port] = fwdHost.split(":");
      loginUrl.hostname = hostname;
      loginUrl.port = port ?? "";
      if (fwdProto === "https" || fwdProto === "http") loginUrl.protocol = `${fwdProto}:`;
    }
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Cache-Control", "private, no-store");
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  // Private pages must never be cached by shared caches (shared factory devices, proxies).
  if (!isPublic(pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}
