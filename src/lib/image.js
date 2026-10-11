// Firestore documents are capped at 1 MiB, so photos are resized and re-encoded
// as JPEG in the browser until the data URL fits comfortably under that.
const MAX_CHARS = 700_000;

export async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let maxDim = 1200;
  try {
    while (maxDim >= 300) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (let q = 0.85; q >= 0.5; q -= 0.1) {
        const url = canvas.toDataURL("image/jpeg", q);
        if (url.length <= MAX_CHARS) return url;
      }
      maxDim = Math.round(maxDim * 0.75);
    }
  } finally {
    bitmap.close?.();
  }
  throw new Error("Image is too large even after compression.");
}
