import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, MessageCircle, ShoppingCart, X, Plus, Minus, Check } from 'lucide-react'
import { sb, CATS, eff } from './lib/api'

const TABS = [['All',''],['Milk','Milk'],['Butter & Cheese','Butter & Cheese'],['Paneer & Dahi','Paneer & Dahi'],['Ghee','Ghee'],['Ice Cream','Ice Cream & Sweets'],['Drinks','Beverages']]

export function Img({ p }) {
  const [s, setS] = useState(p.image_url ? 0 : 1)
  useEffect(() => setS(p.image_url ? 0 : 1), [p.image_url, p.slug])
  if (s > 1) return (
    <svg viewBox="0 0 100 100" className="h-full w-full"><rect width="100" height="100" fill="#fee2e2" />
      <circle cx="50" cy="50" r="28" fill="#fff" /><text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="800" fill="#ED1C24">{(p.name.replace(/^Amul\s+/, '')[0] || 'A')}</text></svg>)
  return <img alt={p.name} loading="lazy" src={s === 0 ? p.image_url : `/images/${p.slug}.png`} onError={() => setS(s + 1)} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
}

export default function Store() {
  const [products, setP] = useState([]), [st, setSt] = useState(null)
  const [cart, setCart] = useState({}), [cat, setCat] = useState(''), [q, setQ] = useState(''), [dq, setDq] = useState('')
  const [open, setOpen] = useState(false), [geo, setGeo] = useState(null), [done, setDone] = useState(null), [busy, setBusy] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', address: '', landmark: '' })

  const load = async () => {
    const [a, b] = await Promise.all([sb.from('products').select('*').order('created_at'), sb.from('site_settings').select('*').limit(1).single()])
    setP(a.data || []); setSt(b.data)
  }
  useEffect(() => {
    load()
    const ch = sb.channel('live').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, load).subscribe()
    return () => sb.removeChannel(ch)
  }, [])
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t) }, [q])

  const shown = useMemo(() => products.filter(p => (!cat || p.category === cat) && (!dq || (p.name + p.category).toLowerCase().includes(dq.toLowerCase()))), [products, cat, dq])
  const lines = Object.entries(cart).map(([id, n]) => ({ p: products.find(x => x.id === id), n })).filter(l => l.p)
  const sub = lines.reduce((s, l) => s + l.p.price * l.n, 0), count = lines.reduce((s, l) => s + l.n, 0)
  const isOpen = st?.store_is_open !== false
  const fee = count && st && sub < st.free_delivery_threshold ? Number(st.delivery_fee) : 0

  const add = (p, d) => {
    if (!isOpen) return
    const n = (cart[p.id] || 0) + d
    if (n > eff(p)) return
    setCart(c => { const x = { ...c }; n <= 0 ? delete x[p.id] : (x[p.id] = n); return x })
  }
  const locate = () => navigator.geolocation?.getCurrentPosition(r => setGeo({ lat: +r.coords.latitude.toFixed(6), lng: +r.coords.longitude.toFixed(6) }), () => alert('Could not get your location. Allow location access and try again.'), { enableHighAccuracy: true, timeout: 10000 })
  const place = async () => {
    if (!f.name || f.phone.replace(/\D/g, '').length < 10 || !f.address) return alert('Enter your name, a 10-digit phone number and your address.')
    setBusy(true)
    const { data, error } = await sb.rpc('place_order', { p_name: f.name, p_phone: f.phone, p_address: f.address, p_landmark: f.landmark, p_lat: geo?.lat ?? null, p_lng: geo?.lng ?? null, p_items: lines.map(l => ({ product_id: l.p.id, quantity: l.n })) })
    setBusy(false)
    if (error) return alert(error.message)
    setDone({ id: data, lines, total: sub + fee, fee }); setCart({}); setOpen(false); load()
  }

  return (
    <div>
      {st?.show_banner && st.announcement_banner_text && <div className="bg-amul py-2 text-center text-sm font-semibold text-white">{st.announcement_banner_text}</div>}
      {!isOpen && <div className="bg-rose-600 py-3 text-center font-bold text-white">🌙 {st?.store_closed_message}</div>}
      <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto]">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-amul">amul <span className="text-ink">Fresh Express</span></div>
            <button onClick={locate} className="mt-0.5 flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500"><MapPin size={13} />{geo ? `Deliver to: Current Location (${geo.lat.toFixed(3)}, ${geo.lng.toFixed(3)})` : 'Detect my location'}</button>
          </div>
          <div className="order-3 col-span-2 md:order-none md:col-span-1"><input className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder="Search milk, paneer, butter…" aria-label="Search products" /></div>
          <div className="flex items-center gap-2">
            <a href={`https://wa.me/${(st?.support_whatsapp_number || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp support" className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-0.5"><MessageCircle size={20} /></a>
            <button onClick={() => setOpen(true)} aria-label="Open cart" className="relative grid h-11 w-11 place-items-center rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-0.5"><ShoppingCart size={20} />
              <AnimatePresence>{count > 0 && <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amul px-1 text-[11px] font-extrabold text-white">{count}</motion.span>}</AnimatePresence></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <div className="my-6 grid grid-cols-2 gap-3 md:auto-rows-[120px] md:grid-cols-4">
          {CATS.map((c, i) => (
            <button key={c[0]} onClick={() => setCat(c[0])} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${c[2]} p-4 text-left text-white transition hover:-translate-y-1 hover:shadow-xl ${i === 0 ? 'min-h-32 md:col-span-2 md:row-span-2' : 'min-h-28'}`}>
              <b className="block text-base">{c[0]}</b><span className="text-xs opacity-80">{products.filter(p => p.category === c[0]).length} items</span>
              <span className={`absolute bottom-[-6px] right-2 ${i === 0 ? 'text-[110px]' : 'text-6xl'}`}>{c[1]}</span></button>))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">{TABS.map(t => <button key={t[0]} onClick={() => setCat(t[1])} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${cat === t[1] ? 'border-amul bg-amul text-white' : 'border-zinc-200 bg-white text-zinc-500'}`}>{t[0]}</button>)}</div>
        <div className="grid grid-cols-2 gap-3 pb-16 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {shown.map(p => {
            const s = eff(p), n = cart[p.id] || 0
            const b = s <= 0 ? ['bg-rose-600', 'Out of Stock'] : s <= 5 ? ['bg-amber-600', `Only ${s} left!`] : ['bg-emerald-600', 'In Stock']
            return (
              <motion.article layout key={p.id} className="card group overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden bg-zinc-100"><Img p={p} /><span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${b[0]}`}>{b[1]}</span></div>
                <div className="p-3.5"><span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-500">{p.unit}</span>
                  <h3 className="mb-3 mt-2 min-h-9 text-sm font-semibold leading-snug">{p.name}</h3>
                  <div className="flex items-center justify-between"><div><b className="text-lg">₹{p.price}</b> {p.original_mrp > p.price && <s className="text-xs text-zinc-500">₹{p.original_mrp}</s>}</div>
                    {n ? <div className="flex items-center rounded-xl bg-amul text-white"><button aria-label="Less" onClick={() => add(p, -1)} className="p-2"><Minus size={16} /></button><span className="w-5 text-center font-bold">{n}</span><button aria-label="More" onClick={() => add(p, 1)} className="p-2"><Plus size={16} /></button></div>
                      : <button disabled={s <= 0 || !isOpen} onClick={() => add(p, 1)} className="rounded-xl border-[1.5px] border-amul px-4 py-1.5 font-extrabold text-amul transition hover:bg-amul hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-transparent">Add</button>}
                  </div></div></motion.article>)
          })}
          {!shown.length && <p className="col-span-full py-16 text-center text-zinc-500">No products match your search. Try another word or category.</p>}
        </div>
      </main>
      <footer className="pb-10 text-center text-xs text-zinc-500">Cash on Delivery · <a href="/admin">Admin</a></footer>

      <AnimatePresence>{open && <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-canvas">
          <div className="flex items-center justify-between border-b border-zinc-200 p-4 text-lg font-extrabold">Your cart<button onClick={() => setOpen(false)} aria-label="Close cart"><X /></button></div>
          <div className="flex-1 space-y-2 overflow-auto p-4">
            {!lines.length && <p className="py-16 text-center text-zinc-500">Your cart is empty. Add something fresh.</p>}
            {lines.map(({ p, n }) => <div key={p.id} className="flex items-center gap-3 border-b border-zinc-200/70 py-2 text-sm"><div className="flex-1"><b>{p.name}</b><div className="text-xs text-zinc-500">{p.unit} · ₹{p.price}</div></div>
              <div className="flex items-center rounded-xl bg-amul text-white"><button aria-label="Less" onClick={() => add(p, -1)} className="p-1.5"><Minus size={14} /></button><span className="w-5 text-center font-bold">{n}</span><button aria-label="More" onClick={() => add(p, 1)} className="p-1.5"><Plus size={14} /></button></div><b className="w-14 text-right">₹{p.price * n}</b></div>)}
            {!!lines.length && <>
              <div className="space-y-1 py-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{sub}</span></div><div className="flex justify-between"><span>Delivery fee</span><span>{fee ? `₹${fee}` : 'FREE'}</span></div>
                {fee > 0 && <p className="text-xs text-zinc-500">Add ₹{st.free_delivery_threshold - sub} more for free delivery.</p>}
                <div className="flex justify-between border-t border-dashed border-zinc-300 pt-2 text-base font-extrabold"><span>Total</span><span>₹{sub + fee}</span></div></div>
              <div className="grid gap-2">
                <input className="inp" placeholder="Full name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
                <input className="inp" placeholder="Phone (10 digits)" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
                <input className="inp" placeholder="Full address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
                <input className="inp" placeholder="Landmark (optional)" value={f.landmark} onChange={e => setF({ ...f, landmark: e.target.value })} />
                <p className="text-xs text-zinc-500">{geo ? `📍 GPS attached: ${geo.lat}, ${geo.lng}` : '📍 Tap “Detect my location” in the header to attach GPS.'}</p></div></>}
          </div>
          <div className="border-t border-zinc-200 p-4"><button className="btn w-full" disabled={!lines.length || busy || !isOpen || sub < (st?.min_order_amount || 0)} onClick={place}>
            {busy ? 'Placing order…' : sub < (st?.min_order_amount || 0) && count ? `Minimum order ₹${st.min_order_amount}` : 'Place Order via Cash on Delivery'}</button></div>
        </motion.aside></>}</AnimatePresence>

      <AnimatePresence>{done && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <motion.div initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} className="card w-full max-w-md p-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-white"><Check size={34} /></motion.div>
          <h2 className="text-center text-xl font-extrabold">Order placed</h2><p className="mb-4 mt-1 break-all text-center text-xs text-zinc-500">Order ID: {done.id}</p>
          {done.lines.map(({ p, n }) => <div key={p.id} className="flex justify-between py-0.5 text-sm"><span>{n} × {p.name} ({p.unit})</span><span>₹{p.price * n}</span></div>)}
          <div className="mt-3 flex justify-between border-t border-dashed pt-2 font-extrabold"><span>Pay on delivery</span><span>₹{done.total}</span></div>
          <button className="btn mt-5 w-full" onClick={() => setDone(null)}>Continue shopping</button></motion.div></motion.div>}</AnimatePresence>
    </div>)
      }
