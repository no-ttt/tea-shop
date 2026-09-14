import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;

// 讓 `next dev` 也能取得 Cloudflare bindings（D1 等）的本地模擬，
// 與 `wrangler dev` 接的是同一份本地資料，僅開發時使用，不影響正式部署。
// 不能用頂層 await（Next.js 用 require() 載入此設定檔，不支援 top-level await 的 ESM）。
if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare")
    .then(({ initOpenNextCloudflareForDev }) => initOpenNextCloudflareForDev())
    .catch((err) => {
      console.error("[next.config.ts] initOpenNextCloudflareForDev() failed:", err);
    });
}
