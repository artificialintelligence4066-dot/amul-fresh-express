import { useEffect, useRef, useState } from 'react'
import { sb, CATS, slugify } from './lib/api'

const ST = ['Pending', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled']
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [880, 1175].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.15, c.currentTime + i * 0.18); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.18 + 0.3); o.start(c.currentTime + i * 0.18); o.stop(c.currentTime + i * 0.18 + 0.3) }) } catch {} }
const Sw = ({ on, onClick }) => <button onClick={onClick} aria-label="Toggle" className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-600' : 'bg-zinc-400'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></button>

export default function Admin() {
  const [pin, setPin] = useState(sessionStorage.getItem('apin') || ''), [ok, setOk] = useState(false), [tab, setTab] = useState('inv')
  const [orders, setOrders] = useState([]), [products, setP] = useState([]), [s, setS] = useState(null), [aq, setAq] = useState(''), [seen, setSeen] = useState(0), [adding, setAdding] = useState(false)
  const [np, setNp] = useState({ name: '', category: 'Milk', unit: '', price: '', original_mrp: '', stock_quantity: 20, image_url: '' })
  const last = useRef(null)
  const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, { p_pin: pin, ...args }); if (error) { alert(error.message); return null } return data ?? true }

  const refresh = async () => {
    const o = await rpc('admin_orders', {}); if (!o) { setOk(false); return }
    setOk(true); sessionStorage.setItem('apin', pin)
    if (last.current !== null && o.length > last.current) beep()
    last.current = o.length; setOrders(o)
    const [a, b] = await Promise.all([sb.from('products').select('*').order('created_at', { ascending: false }), sb.from('site_settings').select('*').limit(1).single()])
    setP(a.data || []); if (!s) setS(b.data)
  }
  useEffect(() => { if (pin) refresh() }, [])
  useEffect(() => { if (!ok) return; const t = setInterval(refresh, 5000); return () => clearInterval(t) }, [ok, pin])
  useEffect(() => { if (tab === 'ord') setSeen(orders.length) }, [tab, orders.length])

  const save = async p => { await rpc('admin_set_product', { p }); refresh() }

  if (!ok) return (
    <div className="mx-auto mt-24 max-w-xs text-center"><h1 className="mb-1 text-2xl font-extrabold text-amul">amul Admin</h1><p className="mb-4 text-sm text-zinc-500">Enter your admin PIN.</p>
      <input className="inp mb-3 text-center" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && refresh()} placeholder="PIN" />
      <button className="btn w-full" onClick={refresh}>Unlock</button><a href="/" className="mt-5 block text-sm text-zinc-500">Back to store</a></div>)

  const nu = Math.max(0, orders.length - seen)
  const list = products.filter(p => !aq || (p.name + p.category).toLowerCase().includes(aq.toLowerCase()))
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-5">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold text-amul">amul Admin</h1><a href="/" className="text-sm text-zinc-500">Back to store</a></div>
      <div className="my-4 flex gap-2">{[['inv', 'Inventory'], ['ord', 'Orders'], ['set', 'Settings']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === k ? 'border-amul bg-amul text-white' : 'border-zinc-200 bg-white text-zinc-500'}`}>{l}{k === 'ord' && nu > 0 && <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs font-extrabold text-amul">{nu} new</span>}</button>)}</div>

      {tab === 'inv' && <>
        <div className="mb-3 flex gap-2"><input className="inp" placeholder="Search products…" value={aq} onChange={e => setAq(e.target.value)} /><button className="btn whitespace-nowrap" onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add product'}</button></div>
        {adding && <div className="card mb-4 grid gap-2 p-4 sm:grid-cols-2">
          <input className="inp" placeholder="Name" value={np.name} onChange={e => setNp({ ...np, name: e.target.value })} />
          <select className="inp" value={np.category} onChange={e => setNp({ ...np, category: e.target.value })}>{CATS.map(c => <option key={c[0]}>{c[0]}</option>)}</select>
          <input className="inp" placeholder="Unit (e.g. 500 ml)" value={np.unit} onChange={e => setNp({ ...np, unit: e.target.value })} />
          <input className="inp" type="number" placeholder="Selling price" value={np.price} onChange={e => setNp({ ...np, price: e.target.value })} />
          <input className="inp" type="number" placeholder="MRP" value={np.original_mrp} onChange={e => setNp({ ...np, original_mrp: e.target.value })} />
          <input className="inp" type="number" placeholder="Initial stock" value={np.stock_quantity} onChange={e => setNp({ ...np, stock_quantity: e.target.value })} />
          <input className="inp sm:col-span-2" placeholder="Image URL (optional)" value={np.image_url} onChange={e => setNp({ ...np, image_url: e.target.value })} />
          <button className="btn sm:col-span-2" onClick={async () => { if (!np.name || !np.price) return alert('Name and price are required.'); await save({ ...np, slug: slugify(np.name + ' ' + np.unit), price: +np.price, original_mrp: +np.original_mrp || +np.price, stock_quantity: +np.stock_quantity || 0, is_active: true }); setAdding(false); setNp({ ...np, name: '', unit: '', price: '', original_mrp: '' }) }}>Save product</button></div>}
        <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-zinc-500"><th className="p-3">Product</th><th>Price ₹</th><th>Stock</th><th>Available</th><th /></tr></thead><tbody>
          {list.map(p => <tr key={p.id} className="border-t border-zinc-100"><td className="p-3"><b>{p.name}</b><div className="text-xs text-zinc-500">{p.unit} · {p.category}</div></td>
            <td><input className="inp w-24 !py-1.5" type="number" defaultValue={p.price} onBlur={e => +e.target.value !== +p.price && save({ ...p, price: +e.target.value })} /></td>
            <td><input className="inp w-24 !py-1.5" type="number" defaultValue={p.stock_quantity} onBlur={e => +e.target.value !== p.stock_quantity && save({ ...p, stock_quantity: +e.target.value })} /></td>
            <td><Sw on={p.is_active} onClick={() => save({ ...p, is_active: !p.is_active })} /></td>
            <td><button className="px-2 text-rose-600" onClick={async () => { if (confirm(`Delete ${p.name}?`)) { await rpc('admin_delete_product', { p_id: p.id }); refresh() } }}>Delete</button></td></tr>)}</tbody></table></div></>}

      {tab === 'ord' && (orders.length ? orders.map(o => <div key={o.id} className="card mb-3 p-4 text-sm leading-relaxed">
        <div className="flex flex-wrap justify-between gap-1"><b>{o.customer_name}</b><span className="text-zinc-500">{new Date(o.created_at).toLocaleString()}</span></div>
        <a className="font-bold text-amul" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a><br />{o.delivery_address}{o.landmark && ` (${o.landmark})`}
        {o.latitude != null && <> · <a className="font-bold text-amul" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}>Open map pin</a></>}
        <div className="my-1 text-zinc-600">{(o.items || []).map(i => `${i.quantity} × ${i.product_name}`).join(' · ')}</div>
        <b>₹{o.total_amount}</b> <span className="text-zinc-500">(delivery ₹{o.delivery_fee}, Cash on Delivery)</span>
        <select className="inp mt-2 max-w-48" value={o.order_status} onChange={async e => { await rpc('admin_set_status', { p_id: o.id, p_status: e.target.value }); refresh() }}>{ST.map(x => <option key={x}>{x}</option>)}</select></div>)
        : <p className="py-16 text-center text-zinc-500">No orders yet. New orders appear here with a chime.</p>)}

      {tab === 'set' && s && <div className="card grid max-w-xl gap-3 p-5">
        <label className="flex items-center justify-between font-semibold">Store open<Sw on={s.store_is_open} onClick={() => setS({ ...s, store_is_open: !s.store_is_open })} /></label>
        {[['store_closed_message', 'Closed store message'], ['delivery_fee', 'Delivery fee (₹)', 1], ['free_delivery_threshold', 'Free delivery above (₹)', 1], ['min_order_amount', 'Minimum order (₹)', 1], ['announcement_banner_text', 'Announcement bar text'], ['support_whatsapp_number', 'WhatsApp support number']].map(([k, l, n]) =>
          <label key={k} className="grid gap-1 text-sm font-semibold">{l}<input className="inp" type={n ? 'number' : 'text'} value={s[k] ?? ''} onChange={e => setS({ ...s, [k]: n ? +e.target.value : e.target.value })} /></label>)}
        <label className="flex items-center justify-between font-semibold">Show announcement bar<Sw on={s.show_banner} onClick={() => setS({ ...s, show_banner: !s.show_banner })} /></label>
        <button className="btn" onClick={async () => (await rpc('admin_save_settings', { p: s })) && alert('Settings saved.')}>Save Settings</button></div>}
    </div>)
            }
          
