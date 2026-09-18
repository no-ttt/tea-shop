import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data";
import "./globals.css";

// 全站每個頁面都經由這個 root layout 讀取 D1（getSiteSettings），強制 dynamic
// 避免 Next.js/OpenNext 在 build 階段嘗試把任何路由預渲染成靜態頁——建置環境下
// 短生命週期呼叫 D1 曾經觸發 SQLITE_BUSY/internal error，且 D1 binding 本來就
// 只在真實請求執行環境中可用，靜態預渲染階段拿不到。
export const dynamic = "force-dynamic";

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
  const settings = await getSiteSettings();
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
