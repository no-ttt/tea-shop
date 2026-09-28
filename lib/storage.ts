import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AdminValidationError } from "./admin-data";

/**
 * 後台上傳圖片的唯一存取層（R2 binding `UPLOADS`），角色同 lib/db/client.ts：
 * binding 只能在請求中取得，每次呼叫都即時拿，不做模組層級單例。
 *
 * 物件 key 形如 `products/2026-09/<uuid>.webp`，對外網址是 `/uploads/<key>`
 * （由 app/uploads/[...key]/route.ts 讀出），存進 D1 的也是這個相對路徑，
 * 所以前台讀圖的程式碼完全不用知道圖片放在 R2。
 */

export const UPLOAD_URL_PREFIX = "/uploads/";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const UPLOAD_FOLDERS = ["products", "regions", "branding"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.UPLOADS;
}

/** 驗證並寫入一張圖片，回傳可直接存進資料庫的網址（`/uploads/...`）。 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!UPLOAD_FOLDERS.includes(folder as UploadFolder)) {
    throw new AdminValidationError("不支援的上傳分類");
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    throw new AdminValidationError("只能上傳 JPG、PNG、WebP、GIF 或 AVIF 圖片");
  }
  if (file.size === 0) {
    throw new AdminValidationError("檔案是空的");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AdminValidationError("圖片不能超過 10MB");
  }

  const month = new Date().toISOString().slice(0, 7);
  const key = `${folder}/${month}/${crypto.randomUUID()}.${ext}`;
  const bucket = await getBucket();
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return `${UPLOAD_URL_PREFIX}${key}`;
}

/** 讀出一張圖片；找不到回傳 null。 */
export async function getUploadedImage(key: string): Promise<R2ObjectBody | null> {
  const bucket = await getBucket();
  return bucket.get(key);
}
