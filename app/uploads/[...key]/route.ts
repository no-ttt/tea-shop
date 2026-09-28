import { NextRequest } from "next/server";
import { getUploadedImage } from "@/lib/storage";

/**
 * 公開讀取後台上傳到 R2 的圖片。每個 key 都含隨機 UUID、上傳後不會被覆寫，
 * 所以可以放心設成 immutable 長快取。
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const object = await getUploadedImage(key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  if (request.headers.get("if-none-match") === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}
