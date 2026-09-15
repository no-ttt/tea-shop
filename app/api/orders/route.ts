import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createOrder, getSiteSettings, OrderValidationError } from "@/lib/data";
import { sendOrderNotification } from "@/lib/email";
import type { OrderPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  let payload: OrderPayload;
  try {
    payload = (await request.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ error: "請求內容格式錯誤" }, { status: 400 });
  }

  try {
    const confirmation = await createOrder(payload);

    // Workers 的 isolate 可能在回應送出後就結束執行，未 await 的 promise 不保證能跑完；
    // 用 ctx.waitUntil() 讓 runtime 保留 isolate 直到這個 fire-and-forget 呼叫完成，
    // 訂單建立的回應仍然不會等這個 promise（不影響下單速度），只是確保它真的會執行完。
    const settings = await getSiteSettings();
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(
      sendOrderNotification(payload, confirmation, settings).catch((err) => {
        console.error("[email] 訂單通知寄送失敗", err);
      }),
    );

    return NextResponse.json(confirmation);
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message, fieldId: err.fieldId }, { status: 400 });
    }
    throw err;
  }
}
