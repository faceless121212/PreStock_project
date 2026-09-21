import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PreStocks — Recent Activity",
  description: "Live prices and recent buy activity across all 8 PreStocks tokens.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      {/* Some browser extensions inject attributes (e.g. overscroll-behavior-x)
          onto <body> before React hydrates. Confirmed nothing in this app sets
          that — suppressing only this element's attribute-mismatch warning,
          not the subtree, so a real mismatch elsewhere still surfaces. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
