import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MEM Workforce", template: "%s · MEM Workforce" },
  description: "Internal workforce app for Maheshwari Electrical Manufacturing Pvt. Ltd.",
  applicationName: "MEM Workforce",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "MEM Workforce", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
