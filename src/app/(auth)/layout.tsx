import Image from "next/image";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/brand/mem-logo-tagline.png"
            alt="MEM — Quality with Reliability"
            width={1267}
            height={518}
            priority
            className="h-auto w-44"
          />
          <p className="mt-4 text-lg font-semibold text-ink">MEM Workforce</p>
          <p className="text-xs text-muted">Maheshwari Electrical Manufacturing Pvt. Ltd.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
