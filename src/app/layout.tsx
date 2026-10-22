import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Alexandria } from "next/font/google";
import "./globals.css";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مِدار | الأسواق العالمية في مِدارٍ واحد",
  description: "منصة عربية لإدارة حسابات المستخدمين والمحافظ والأوامر وطلبات التحويل، مع تفعيل إلزامي ولوحة مطور متكاملة.",
};

export const viewport: Viewport = {
  themeColor: "#08110f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={alexandria.variable}>
      <body>{children}</body>
    </html>
  );
}
