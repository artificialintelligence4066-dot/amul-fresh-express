import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const CATS = [['Milk','🥛','from-red-500 to-orange-400'],['Butter & Cheese','🧈','from-amber-500 to-yellow-300'],['Paneer & Dahi','🧀','from-sky-500 to-indigo-500'],['Ghee','🍯','from-amber-600 to-amber-900'],['Ice Cream & Sweets','🍨','from-pink-500 to-purple-500'],['Beverages','🥤','from-emerald-500 to-teal-600']]
export const eff = p => (p.is_active ? Math.max(0, p.stock_quantity) : 0)
export const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
