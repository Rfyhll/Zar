'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { timeAgo } from '@/lib/image'
import type { MarketProduct, ProductCommentItem } from '@/lib/types'
import {
  Star, Heart, MapPin, Minus, Plus, ShoppingBag, Loader2, PackageCheck,
  Banknote, Landmark, Coins, PartyPopper, MessageCircleMore,
} from 'lucide-react'
import { toast } from 'sonner'

export const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

export function Stars({ value, size = 'size-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-emerald-900/10 text-emerald-900/10'}`}
        />
      ))}
    </span>
  )
}

const PAYMENT_OPTIONS = [
  { key: 'COD', label: 'COD (Bayar di Tempat)', desc: 'Bayar tunai saat barang tiba', icon: Banknote },
  { key: 'TRANSFER', label: 'Transfer Bank / E-Wallet', desc: 'Simulasi pembayaran digital', icon: Landmark },
  { key: 'ECOPOINT', label: 'Poin EcoDaur', desc: 'Tukar poin dari aktivitas daur ulang', icon: Coins },
]

type Step = 'view' | 'checkout' | 'success'

interface Props {
  product: MarketProduct | null
  onClose: () => void
  onUpdated: (p: MarketProduct) => void
}

export default function ProductDetailDialog({ product, onClose, onUpdated }: Props) {
  const user = useApp((s) => s.user)
  const [step, setStep] = useState<Step>('view')
  const [qty, setQty] = useState(1)
  const [address, setAddress] = useState('')
  const [payment, setPayment] = useState('COD')
  const [buying, setBuying] = useState(false)
  const [reviews, setReviews] = useState<ProductCommentItem[]>([])
  const [reviewDraft, setReviewDraft] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [postingReview, setPostingReview] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [lastOrder, setLastOrder] = useState<{ qty: number; totalPrice: number; payment: string } | null>(null)

  useEffect(() => {
    if (!product) return
    setStep('view')
    setQty(1)
    setAddress('')
    setPayment('COD')
    setReviews(product.comments)
    setLiked(product.likedByMe)
    setLikeCount(product.likeCount)
    setReviewDraft('')
    setReviewRating(5)
    setLastOrder(null)
    // depend on id saja — pembaruan data produk yang sama (stok/sold setelah beli)
    // tidak boleh me-reset dialog ke tahap 'view' saat layar sukses tampil
  }, [product?.id])

  if (!product) return null

  const p = product
  const diskon = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0

  async function toggleLike() {
    if (!user) {
      toast.info('Masuk dulu untuk menyukai barang.')
      return
    }
    const r = await fetch(`/api/products/${p.id}/like`, { method: 'POST' })
    if (r.ok) {
      const d = await r.json()
      setLiked(d.liked)
      setLikeCount(d.likeCount)
    }
  }

  async function submitReview() {
    if (!user) {
      toast.info('Masuk dulu untuk mengulas barang.')
      return
    }
    const text = reviewDraft.trim()
    if (!text) return
    setPostingReview(true)
    try {
      const r = await fetch(`/api/products/${p.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, rating: reviewRating }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal mengirim ulasan.')
      setReviews((prev) => [d.comment, ...prev])
      setReviewDraft('')
      toast.success('Ulasan terkirim! Terima kasih 🌟')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengirim ulasan.')
    } finally {
      setPostingReview(false)
    }
  }

  async function placeOrder() {
    if (!user) {
      toast.info('Masuk dulu untuk membeli barang.')
      return
    }
    setBuying(true)
    try {
      const r = await fetch(`/api/products/${p.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty, address: address.trim(), payment }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal membuat pesanan.')
      setLastOrder({ qty: d.order.qty, totalPrice: d.order.totalPrice, payment: d.order.payment })
      onUpdated({ ...p, stock: d.stock, sold: d.sold })
      setStep('success')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat pesanan.')
    } finally {
      setBuying(false)
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl border-emerald-100 p-0 sm:rounded-3xl">
        {step === 'view' && (
          <div>
            <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              {/* foto produk */}
              <div className="relative overflow-hidden rounded-2xl bg-emerald-50">
                <img src={p.imageUrl} alt={p.title} className="aspect-square w-full object-cover" />
                {diskon > 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white shadow">
                    Diskon {diskon}%
                  </span>
                )}
                <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow backdrop-blur">
                  {p.category}
                </span>
              </div>

              {/* info utama */}
              <div className="flex flex-col">
                <h2 className="text-lg font-black leading-snug text-emerald-950">{p.title}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-900/60">
                  <span className="inline-flex items-center gap-1">
                    <Stars value={p.rating} /> <b className="text-emerald-950">{p.rating.toFixed(1)}</b>
                  </span>
                  <span>·</span>
                  <span><b className="text-emerald-950">{p.sold}</b> terjual</span>
                  <span>·</span>
                  <span><b className="text-emerald-950">{likeCount}</b> suka</span>
                </div>

                <div className="mt-3 rounded-2xl bg-orange-50 px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-orange-600">{rupiah(p.price)}</span>
                    {p.oldPrice && p.oldPrice > p.price && (
                      <span className="text-sm text-emerald-900/40 line-through">{rupiah(p.oldPrice)}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-orange-500">
                    Gratis ongkir min. Rp 20.000 · COD tersedia
                  </p>
                </div>

                {/* penjual */}
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 px-3 py-2.5">
                  {p.seller.avatarUrl ? (
                    <img src={p.seller.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">
                      {p.seller.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-emerald-950">{p.seller.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-900/50">
                      <MapPin className="size-3" /> {p.location} · @{p.seller.username}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                    onClick={() => toast.info('Fitur chat penjual segera hadir 💬')}
                  >
                    <MessageCircleMore className="size-3.5" /> Chat
                  </Button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-emerald-900/60">
                  <span>Stok: <b className="text-emerald-950">{p.stock}</b></span>
                  <span>Belum ada di stokmu? Nanti dijual lagi oleh komunitas ♻️</span>
                </div>

                {/* jumlah */}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-950">Jumlah</span>
                  <div className="inline-flex items-center rounded-full border border-emerald-200">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="grid size-8 place-items-center rounded-l-full text-emerald-700 transition hover:bg-emerald-50"
                      aria-label="Kurangi jumlah"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-black text-emerald-950">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(p.stock, q + 1))}
                      className="grid size-8 place-items-center rounded-r-full text-emerald-700 transition hover:bg-emerald-50"
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-emerald-900/50">maks. {p.stock}</span>
                </div>

                <div className="mt-auto flex gap-2 pt-4">
                  <Button
                    onClick={() => (user ? setStep('checkout') : toast.info('Masuk dulu untuk membeli barang.'))}
                    disabled={p.stock < 1 || buying}
                    className="h-11 flex-1 rounded-full bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400 disabled:opacity-50"
                  >
                    <ShoppingBag className="size-4" />
                    {p.stock < 1 ? 'Stok Habis' : 'Beli Sekarang'}
                  </Button>
                  <Button
                    onClick={toggleLike}
                    variant="outline"
                    className="h-11 w-11 rounded-full border-emerald-200 p-0 text-emerald-700 hover:bg-rose-50"
                    aria-label={liked ? 'Batal suka' : 'Sukai barang'}
                  >
                    <Heart className={`size-5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* deskripsi */}
            <div className="border-t border-emerald-50 px-5 py-4">
              <h3 className="text-sm font-black text-emerald-950">Deskripsi Produk</h3>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-emerald-950/80">{p.description}</p>
            </div>

            {/* ulasan */}
            <div className="border-t border-emerald-50 px-5 py-4">
              <h3 className="text-sm font-black text-emerald-950">
                Ulasan Pembeli <span className="text-emerald-900/50">({reviews.length})</span>
              </h3>
              <div className="mt-3 space-y-3">
                {reviews.length === 0 && (
                  <p className="text-xs text-emerald-900/50">Belum ada ulasan. Jadilah pembeli pertama! 🌟</p>
                )}
                {reviews.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white">
                        {c.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-black text-emerald-950">{c.user.name}</span>
                        <Stars value={c.rating} size="size-3" />
                      </div>
                      <p className="text-sm leading-relaxed text-emerald-950/85">{c.text}</p>
                      <span className="text-[10px] text-emerald-900/40">{timeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* tulis ulasan */}
              <div className="mt-4 rounded-2xl bg-emerald-50/70 p-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-950">Beri rating:</span>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} onClick={() => setReviewRating(i)} aria-label={`Rating ${i}`}>
                      <Star
                        className={`size-5 transition ${i <= reviewRating ? 'fill-amber-400 text-amber-400' : 'fill-white/60 text-emerald-900/25'}`}
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Textarea
                    value={reviewDraft}
                    onChange={(e) => setReviewDraft(e.target.value)}
                    placeholder={user ? 'Bagaimana barangnya? Tulis ulasanmu…' : 'Masuk untuk menulis ulasan…'}
                    rows={2}
                    className="min-h-0 resize-none rounded-xl border-emerald-100 bg-white text-sm"
                  />
                  <Button
                    onClick={submitReview}
                    disabled={postingReview || !reviewDraft.trim()}
                    className="h-9 shrink-0 rounded-full bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {postingReview ? <Loader2 className="size-4 animate-spin" /> : 'Kirim'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="p-5">
            <h2 className="text-lg font-black text-emerald-950">Checkout 🧾</h2>
            <p className="mt-0.5 text-xs text-emerald-900/55">
              Pembayaran disimulasikan — ini demo marketplace komunitas.
            </p>

            {/* ringkasan barang */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 p-3">
              <img src={p.imageUrl} alt="" className="size-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-emerald-950">{p.title}</div>
                <div className="text-xs text-emerald-900/55">{p.seller.name} · {p.location}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-orange-600">{rupiah(p.price * qty)}</div>
                <div className="text-[11px] text-emerald-900/50">{qty} × {rupiah(p.price)}</div>
              </div>
            </div>

            {/* alamat */}
            <div className="mt-4">
              <label className="text-xs font-black text-emerald-950">Alamat Pengiriman</label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nama, no. HP, dan alamat lengkap… (contoh: Budi, 0812xxxx, Jl. Tugu No. 3, Banda Aceh)"
                rows={2}
                className="mt-1.5 resize-none rounded-xl border-emerald-100 text-sm"
              />
            </div>

            {/* metode pembayaran */}
            <div className="mt-4">
              <label className="text-xs font-black text-emerald-950">Metode Pembayaran</label>
              <div className="mt-1.5 space-y-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPayment(opt.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                      payment === opt.key
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-emerald-100 bg-white hover:border-emerald-200'
                    }`}
                  >
                    <span className={`grid size-9 place-items-center rounded-xl ${payment === opt.key ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                      <opt.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-emerald-950">{opt.label}</span>
                      <span className="block text-[11px] text-emerald-900/55">{opt.desc}</span>
                    </span>
                    <span className={`size-4 rounded-full border-2 ${payment === opt.key ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep('view')} className="h-11 rounded-full border-emerald-200 px-5 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
                Kembali
              </Button>
              <Button
                onClick={placeOrder}
                disabled={buying || !address.trim()}
                className="h-11 flex-1 rounded-full bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:bg-orange-400 disabled:opacity-50"
              >
                {buying ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                Bayar {rupiah(p.price * qty)}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && lastOrder && (
          <div className="p-8 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100">
              <PartyPopper className="size-10 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-xl font-black text-emerald-950">Pesanan Berhasil! 🎉</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-emerald-900/60">
              Terima kasih sudah belanja ramah lingkungan. Penjual akan segera menghubungimu untuk pengiriman.
            </p>
            <div className="mx-auto mt-5 max-w-sm space-y-2 rounded-2xl bg-emerald-50/80 p-4 text-left text-sm">
              <div className="flex justify-between"><span className="text-emerald-900/60">Barang</span><b className="text-emerald-950">{p.title}</b></div>
              <div className="flex justify-between"><span className="text-emerald-900/60">Jumlah</span><b className="text-emerald-950">{lastOrder.qty} pcs</b></div>
              <div className="flex justify-between"><span className="text-emerald-900/60">Total Bayar</span><b className="text-orange-600">{rupiah(lastOrder.totalPrice)}</b></div>
              <div className="flex justify-between"><span className="text-emerald-900/60">Metode</span><b className="text-emerald-950">{lastOrder.payment}</b></div>
              <div className="flex justify-between"><span className="text-emerald-900/60">Status</span><b className="text-emerald-600">DIPROSES</b></div>
            </div>
            <Button
              onClick={onClose}
              className="mt-6 h-11 rounded-full bg-emerald-600 px-8 text-sm font-black text-white hover:bg-emerald-500"
            >
              Selesai
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
