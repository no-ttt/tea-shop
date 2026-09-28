"use client";

import { useRef, useState } from "react";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

// next.config.ts 關掉了 next/image 最佳化，前台會直接載入原檔，所以在瀏覽器端先縮圖：
// 長邊超過 MAX_EDGE 或檔案超過 COMPRESS_OVER_BYTES 的 JPG/PNG/WebP 重新輸出成 WebP。
const MAX_EDGE = 2400;
const COMPRESS_OVER_BYTES = 1.5 * 1024 * 1024;
const WEBP_QUALITY = 0.85;
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= COMPRESS_OVER_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    // 不支援輸出 WebP 的舊瀏覽器會退回 PNG，這時通常比原檔還大，直接用原檔
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export default function ImageUploadButton({
  folder,
  onUploaded,
  label = "上傳圖片",
  compress = true,
  disabled = false,
}: {
  folder: "products" | "regions" | "branding";
  onUploaded: (url: string) => void;
  label?: string;
  /** QR Code 這類需要保持銳利的圖片傳 false，原檔上傳 */
  compress?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // 讓同一個檔案可以再選一次
    if (!picked) return;

    setUploading(true);
    setError(null);
    try {
      const file = compress ? await compressImage(picked) : picked;
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: form });
      if (!res.ok) {
        setError(await parseErrorMessage(res, "上傳失敗"));
        return;
      }
      const data = (await res.json()) as { url: string };
      onUploaded(data.url);
    } catch {
      setError("上傳失敗，請確認網路連線");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <button
        type="button"
        className={styles.buttonSecondary}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? "上傳中…" : label}
      </button>
      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}
    </div>
  );
}
