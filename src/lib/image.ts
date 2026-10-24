/** Baca file mentah sebagai data URL (mempertahankan tipe asli — dipakai untuk format yang tak bisa didekode browser). */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('Gagal membaca berkas.'))
    fr.readAsDataURL(file)
  })
}

/** Muat gambar via <img> — fallback ketika createImageBitmap gagal (mis. WebP lama, SVG, BMP). */
function decodeViaImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gambar tidak dapat didekode browser.'))
    }
    img.src = url
  })
}

/** Gambar sumber (bitmap atau elemen img) → data URL JPEG dengan sisi terpanjang `max` px. */
function drawToJpeg(src: CanvasImageSource, sw: number, sh: number, max: number, quality: number): string {
  const scale = Math.min(1, max / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung browser ini.')
  ctx.drawImage(src, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Siapkan gambar APA PUN untuk diunggah:
 * 1. GIF diteruskan apa adanya agar animasinya tetap hidup (bila muat).
 * 2. Coba dekode via createImageBitmap (jpg/png/webp/gif/avif/bmp…).
 * 3. Coba dekode via <img> (fallback luas, termasuk SVG).
 * 4. Bila tetap gagal (mis. HEIC dari iPhone di Chrome), teruskan berkas asli —
 *    server menyimpan tipe aslinya; di Safari/iOS gambar tetap tampil normal.
 */
export async function fileToResizedDataUrl(file: File, max = 1200, quality = 0.82): Promise<string> {
  const MAX_RAW = 3_000_000 // batas byte untuk berkas yang diteruskan tanpa resize

  // 1) GIF: jangan di-resize supaya animasi tidak hilang
  if (file.type === 'image/gif') {
    if (file.size <= MAX_RAW) return readAsDataURL(file)
    throw new Error('Ukuran GIF terlalu besar (maks 3 MB).')
  }

  // 2) createImageBitmap
  try {
    const bitmap = await createImageBitmap(file)
    try {
      return drawToJpeg(bitmap, bitmap.width, bitmap.height, max, quality)
    } finally {
      bitmap.close()
    }
  } catch {
    /* lanjut ke fallback */
  }

  // 3) elemen <img>
  try {
    const img = await decodeViaImg(file)
    return drawToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, max, quality)
  } catch {
    /* lanjut ke passthrough */
  }

  // 4) teruskan berkas asli tanpa diubah (HEIC/HEIF dsb.)
  if (file.size > MAX_RAW)
    throw new Error('Ukuran gambar terlalu besar (maks 3 MB). Coba format JPG/PNG atau kecilkan ukurannya.')
  return readAsDataURL(file)
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  const months = Math.floor(days / 30)
  return `${months} bulan lalu`
}
