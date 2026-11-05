'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { fileToResizedDataUrl } from '@/lib/image'
import type { MarketProduct } from '@/lib/types'
import ProductDetailDialog, { rupiah, Stars } from '@/components/ecodaur/product-detail-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  ShoppingBag, Search, Heart, MapPin, Loader2, ImagePlus, Sparkles,
  Package, Truck, HandCoins, Leaf, BadgePercent, CircleDollarSign,
} from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Semua', 'Dekorasi', 'Fashion', 'Aksesoris', 'Taman & Organik', 'Mainan']

export default function PasarView() {
  const user = useApp((s) => s.user)
  const [products, setProducts] = useState<MarketProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Semua')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MarketProduct | null>(null)
  const [sellOpen, setSellOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'Semua') params.set('category', category)
    if (query.trim()) params.set('q', query.trim())
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category, query])

  useEffect(load, [load])

  function updateProduct(p: MarketProduct) {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)))
    setSelected((prev) => (prev && prev.id === p.id ? p : prev))
  }

  async function toggleLike(pr: MarketProduct) {
    if (!user) {
      toast.info('Masuk dulu untuk menyukai barang.')
      return
    }
    const r = await fetch(`/api/products/${pr.id}/like`, { method: 'POST' })
    if (r.ok) {
      const d = await r.json()
      updateProduct({ ...pr, likedByMe: d.liked, likeCount: d.likeCount })
    }
  }

  const totalTerjual = products.reduce((a, p) => a + p.sold, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* banner pasar */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-600/20 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
              <Leaf className="size-3.5" /> MARKETPLACE DAUR ULANG PERTAMA DI KOTA MU
            </div>
            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-black tracking-tight sm:text-3xl">
              <ShoppingBag className="size-7" /> Pasar EcoDaur
            </h1>
            <p className="mt-1 max-w-lg text-sm text-emerald-50/90">
              Jual beli barang kreasi dari sampah yang sudah dikelola — tiap pembelian berarti satu sampah
              lebih sedikit di bumi 🌏
            </p>
          </div>
          <Button
            onClick={() => (user ? setSellOpen(true) : toast.info('Masuk dulu untuk mulai menjual barang.'))}
            className="h-11 rounded-full bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-900/25 transition hover:bg-orange-400"
          >
            <CircleDollarSign className="size-4" /> Jual Barangmu
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
            <Package className="size-3.5" /> {products.length} barang terdaftar
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
            <Truck className="size-3.5" /> {totalTerjual} terjual bulan ini
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
            <HandCoins className="size-3.5" /> COD tersedia
          </span>
        </div>
      </div>

      {/* strip promo ala shopee */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-2.5 text-[11px] font-black text-orange-600">
        <span className="inline-flex items-center gap-1.5"><Truck className="size-3.5" /> GRATIS ONGKIR SETIAP HARI</span>
        <span className="inline-flex items-center gap-1.5"><BadgePercent className="size-3.5" /> DISKON SAMPAI 40%</span>
        <span className="inline-flex items-center gap-1.5"><HandCoins className="size-3.5" /> BAYAR DI TEMPAT (COD)</span>
        <span className="inline-flex items-center gap-1.5"><Leaf className="size-3.5" /> 100% BARANG DAUR ULANG</span>
      </div>

      {/* pencarian + kategori */}
      <div className="sticky top-16 z-30 mt-4 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5">
          <Search className="size-4 shrink-0 text-emerald-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari barang daur ulang… (tas, pot, lampu, dompet)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-emerald-900/40"
          />
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                category === c
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* grid produk */}
      {loading ? (
        <div className="grid place-items-center py-16 text-emerald-700">
          <Loader2 className="size-7 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 py-14 text-center">
          <p className="text-sm font-semibold text-emerald-800">Belum ada barang di kategori ini.</p>
          <p className="mt-1 text-xs text-emerald-900/50">Yuk jadilah penjual pertama di Pasar EcoDaur!</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 pb-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((pr) => {
            const diskon = pr.oldPrice && pr.oldPrice > pr.price
              ? Math.round(((pr.oldPrice - pr.price) / pr.oldPrice) * 100)
              : 0
            return (
              <div
                key={pr.id}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                onClick={() => setSelected(pr)}
              >
                <div className="relative aspect-square overflow-hidden bg-emerald-50">
                  <img
                    src={pr.imageUrl}
                    alt={pr.title}
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {diskon > 0 && (
                    <span className="absolute left-2 top-2 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
                      -{diskon}%
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(pr) }}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition hover:scale-110"
                    aria-label={pr.likedByMe ? 'Batal suka' : 'Sukai barang'}
                  >
                    <Heart className={`size-4 ${pr.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-emerald-900/60'}`} />
                  </button>
                  {pr.stock < 1 && (
                    <div className="absolute inset-0 grid place-items-center bg-emerald-950/45 backdrop-blur-[1px]">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-950">Stok Habis</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-8 text-xs font-semibold leading-snug text-emerald-950">
                    {pr.title}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-orange-600">{rupiah(pr.price)}</span>
                    {pr.oldPrice && pr.oldPrice > pr.price && (
                      <span className="text-[10px] text-emerald-900/40 line-through">{rupiah(pr.oldPrice)}</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-900/60">
                    <Stars value={pr.rating} size="size-3" />
                    <span className="font-bold text-emerald-950">{pr.rating.toFixed(1)}</span>
                    <span>·</span>
                    <span>{pr.sold >= 20 ? `${pr.sold}+` : pr.sold} terjual</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-900/50">
                    <MapPin className="size-3" /> {pr.location}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 border-t border-emerald-50 pt-1.5">
                    {pr.seller.avatarUrl ? (
                      <img src={pr.seller.avatarUrl} alt="" className="size-4.5 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-4.5 place-items-center rounded-full bg-emerald-600 text-[8px] font-black text-white">
                        {pr.seller.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-[10px] font-semibold text-emerald-900/60">{pr.seller.name}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ProductDetailDialog product={selected} onClose={() => setSelected(null)} onUpdated={updateProduct} />
      <SellDialog open={sellOpen} onClose={() => setSellOpen(false)} onCreated={(np) => { setProducts((prev) => [np, ...prev]); setCategory('Semua') }} />
    </div>
  )
}

/* ================= dialog jual barang ================= */

function SellDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: MarketProduct) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Dekorasi')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [image, setImage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setTitle(''); setDescription(''); setPrice(''); setStock('1'); setImage(null); setCategory('Dekorasi')
    }
  }, [open])

  async function pickImage(f: File | undefined) {
    if (!f) return
    try {
      setImage(await fileToResizedDataUrl(f, 900, 0.82))
    } catch {
      toast.error('Gagal membaca foto.')
    }
  }

  async function submit() {
    if (!title.trim() || !description.trim() || !image || !price) {
      toast.error('Lengkapi foto, nama, deskripsi, dan harga ya.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          stock: Number(stock) || 1,
          image,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal memasang barang.')
      toast.success('Barang berhasil dipasang di Pasar! 🎉')
      onCreated(d.product)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memasang barang.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-3xl border-emerald-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-950">
            <Sparkles className="size-5 text-emerald-600" /> Jual Barang Daur Ulang
          </DialogTitle>
          <DialogDescription>
            Ubah sampah jadi rupiah — pasang kreasi terbaikmu di Pasar EcoDaur.
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={() => fileRef.current?.click()}
          className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 transition hover:border-emerald-400"
        >
          {image ? (
            <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-emerald-700">
              <ImagePlus className="size-8" />
              <span className="text-xs font-bold">Pilih Foto Barang</span>
              <span className="text-[10px] text-emerald-900/50">JPG/PNG, maks 3 MB</span>
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.avif" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />

        <div className="space-y-3">
          <div>
            <label className="text-xs font-black text-emerald-950">Nama Barang</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Pot Gantung dari Botol Bekas" className="mt-1 rounded-xl border-emerald-100 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-black text-emerald-950">Harga (Rp)</label>
              <Input type="number" min={1000} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25000" className="mt-1 rounded-xl border-emerald-100 text-sm" />
            </div>
            <div>
              <label className="text-xs font-black text-emerald-950">Stok</label>
              <Input type="number" min={1} value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 rounded-xl border-emerald-100 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-emerald-950">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-400"
            >
              {CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-emerald-950">Deskripsi</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Dibuat dari apa, bagaimana cara pakainya, kenapa worth it…" className="mt-1 resize-none rounded-xl border-emerald-100 text-sm" />
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={submitting}
          className="h-11 w-full rounded-full bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:bg-orange-400 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
          Pasang di Pasar
        </Button>
      </DialogContent>
    </Dialog>
  )
}
