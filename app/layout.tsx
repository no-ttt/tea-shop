import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "棋願製造｜茶單選購",
  description: "棋願製造線上茶單選購",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
