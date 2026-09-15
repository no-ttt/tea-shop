import { NextRequest, NextResponse } from "next/server";
import { deleteProductImage, AdminValidationError } from "@/lib/admin-data";
import { handleAdminError } from "@/lib/admin-api-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const { id, imageId } = await params;
    const parsedImageId = Number(imageId);
    if (!Number.isInteger(parsedImageId)) {
      throw new AdminValidationError("圖片代碼格式錯誤");
    }
    const images = await deleteProductImage(id, parsedImageId);
    return NextResponse.json({ images });
  } catch (err) {
    return handleAdminError(err);
  }
}
