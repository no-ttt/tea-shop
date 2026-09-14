import type { Metadata } from "next";
import { getBaseUrl, fetchJson } from "@/lib/fetch-api";
import type { SiteSettings } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "棋願製造｜茶單選購",
  description: "棋願製造線上茶單選購",
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

function safeScale(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR_PATTERN.test(value) ? value : fallback;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const baseUrl = await getBaseUrl();
  const settings = await fetchJson<SiteSettings>(baseUrl, "/api/site-settings");
  const { theme } = settings;

  const scaleTitle = safeScale(theme.scaleTitle, 1);
  const scaleItem = safeScale(theme.scaleItem, 1);
  const scalePrice = safeScale(theme.scalePrice, 1);
  const colorTitle = safeColor(theme.colorTitle, "#f3ede1");
  const colorItem = safeColor(theme.colorItem, "#f3ede1");
  const colorPrice = safeColor(theme.colorPrice, "#c98a4b");

  return (
    <html lang="zh-Hant">
      <head>
        <style>{`:root {
          --scale-title: ${scaleTitle};
          --scale-item: ${scaleItem};
          --scale-price: ${scalePrice};
          --color-title: ${colorTitle};
          --color-item: ${colorItem};
          --color-price: ${colorPrice};
        }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
