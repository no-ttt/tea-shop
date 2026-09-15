/** 後台 client component 共用工具，不能 import 伺服端模組（lib/admin-data.ts 依賴 D1 連線）。 */
export async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}
