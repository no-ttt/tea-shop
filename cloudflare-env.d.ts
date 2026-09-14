// 讓 @opennextjs/cloudflare 的全域 CloudflareEnv 型別接上 wrangler.jsonc 產生的 bindings。
// worker-configuration.d.ts 由 `npx wrangler types` 產生，wrangler.jsonc 變動後需重新執行。
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CloudflareEnv extends Env {}
