import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next internals and public static files.
    "/((?!_next/static|_next/image|icon.png|apple-icon.png|manifest.webmanifest|brand/|icons/|sw.js).*)",
  ],
};
