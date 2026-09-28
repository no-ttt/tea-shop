import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage";
import { AdminValidationError } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

/** multipart/form-data：`file`（圖片檔）＋ `folder`（products／regions／branding）。回傳 `{ url }`。 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const folder = form.get("folder");
    if (!(file instanceof File)) throw new AdminValidationError("沒有收到圖片檔案");
    if (typeof folder !== "string") throw new AdminValidationError("缺少上傳分類");

    const url = await uploadImage(file, folder);
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    return handleAdminError(err);
  }
}
