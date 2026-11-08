import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { signOut } from "@/app/actions/auth";
import { BottomNav, SidebarNav, type NavItem } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    { href: "/tasks", label: user.role === "employee" ? "My Tasks" : "Tasks", icon: "tasks" },
  ];
  if (user.role === "admin") items.push({ href: "/employees", label: "Employees", icon: "people" });
  if (user.role === "manager") items.push({ href: "/employees", label: "My Team", icon: "people" });
  if (user.role === "admin") items.push({ href: "/departments", label: "Departments", icon: "building" });
  items.push({ href: "/profile", label: "Profile", icon: "user" });

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2">
          <Image src="/brand/mem-logo.png" alt="MEM" width={1267} height={360} className="h-7 w-auto" priority />
          <span className="text-sm font-semibold text-ink">Workforce</span>
        </Link>
        <SidebarNav items={items} />
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate px-2 text-sm font-semibold text-ink">{user.fullName}</p>
          <p className="px-2 text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          <form action={signOut} className="mt-3">
            <button type="submit" className="min-h-11 w-full rounded-lg px-2 text-left text-sm font-medium text-muted hover:bg-gray-100 hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/brand/mem-logo.png" alt="MEM" width={1267} height={360} className="h-6 w-auto" priority />
          <span className="text-sm font-semibold text-ink">Workforce</span>
        </Link>
        <span className="max-w-[45%] truncate text-xs text-muted">{user.fullName}</span>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <BottomNav items={items} />
    </div>
  );
}
