-- Amul Fresh Express: schema, seed data, security and RPCs. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto with schema extensions;

create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  store_is_open boolean not null default true,
  store_closed_message text not null default 'We are resting! Orders resume tomorrow at 6:00 AM.',
  delivery_fee numeric not null default 25,
  free_delivery_threshold numeric not null default 199,
  min_order_amount numeric not null default 99,
  announcement_banner_text text default '⚡ Fresh morning milk delivered in 15 minutes!',
  show_banner boolean not null default true,
  support_whatsapp_number text default '+919876543210',
  updated_at timestamptz not null default now());

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null check (category in ('Milk','Butter & Cheese','Paneer & Dahi','Ghee','Ice Cream & Sweets','Beverages')),
  unit text not null,
  price numeric not null,
  original_mrp numeric not null,
  stock_quantity integer not null default 20,
  image_url text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now());

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  landmark text,
  latitude numeric,
  longitude numeric,
  total_amount numeric not null,
  delivery_fee numeric not null default 0,
  order_status text not null default 'Pending' check (order_status in ('Pending','Confirmed','Packed','Out for Delivery','Delivered','Cancelled')),
  payment_method text not null default 'Cash on Delivery' check (payment_method = 'Cash on Delivery'),
  created_at timestamptz not null default now());

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  unit_price numeric not null,
  quantity integer not null check (quantity > 0));

create table if not exists admin_secrets (pin_hash text not null);
insert into admin_secrets select extensions.crypt('1234', extensions.gen_salt('bf')) where not exists (select 1 from admin_secrets);
insert into site_settings default values;

insert into products (name, slug, category, unit, price, original_mrp, stock_quantity) values
 ('Amul Gold Milk','amul-gold-milk-500-ml','Milk','500 ml',34,35,40),
 ('Amul Gold Milk','amul-gold-milk-1-l','Milk','1 L',68,70,30),
 ('Amul Taaza Toned Milk','amul-taaza-toned-milk-500-ml','Milk','500 ml',28,29,50),
 ('Amul Taaza Toned Milk','amul-taaza-toned-milk-1-l','Milk','1 L',56,58,35),
 ('Amul Salted Butter','amul-salted-butter-100-g','Butter & Cheese','100 g',62,64,25),
 ('Amul Salted Butter','amul-salted-butter-500-g','Butter & Cheese','500 g',300,310,12),
 ('Amul Pasteurized Processed Cheese Slices','amul-cheese-slices-200-g','Butter & Cheese','200 g',135,145,18),
 ('Amul Malai Fresh Paneer','amul-malai-fresh-paneer-200-g','Paneer & Dahi','200 g',95,100,4),
 ('Amul Masti Dahi Pouch','amul-masti-dahi-pouch-400-g','Paneer & Dahi','400 g',35,38,22),
 ('Amul Pure Cow Ghee','amul-pure-cow-ghee-1-l','Ghee','1 L',640,680,9),
 ('Amul Vanilla Magic Ice Cream','amul-vanilla-magic-500-ml','Ice Cream & Sweets','500 ml',120,135,3),
 ('Amul Kool Rose','amul-kool-rose-200-ml','Beverages','200 ml',30,30,24),
 ('Amul Kool Kesar','amul-kool-kesar-200-ml','Beverages','200 ml',30,30,0);

-- Row Level Security: the public can only READ products and settings.
-- orders, order_items and admin_secrets have no policies, so they are closed to direct access.
alter table site_settings enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admin_secrets enable row level security;
create policy "public read settings" on site_settings for select using (true);
create policy "public read products" on products for select using (true);

-- Customers place orders only through this function (prices and stock are checked on the server).
create or replace function place_order(p_name text, p_phone text, p_address text, p_landmark text, p_lat numeric, p_lng numeric, p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare s site_settings; it jsonb; pr products; sub numeric := 0; fee numeric; oid uuid;
begin
  select * into s from site_settings limit 1;
  if not s.store_is_open then raise exception '%', s.store_closed_message; end if;
  if coalesce(trim(p_name),'') = '' or length(regexp_replace(coalesce(p_phone,''),'\D','','g')) < 10 or coalesce(trim(p_address),'') = '' then
    raise exception 'Enter your name, a 10-digit phone number and your address.'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from products where id = (it->>'product_id')::uuid for update;
    if not found or not pr.is_active or pr.stock_quantity < (it->>'quantity')::int or (it->>'quantity')::int < 1 then
      raise exception '% is out of stock or has too few units left.', coalesce(pr.name,'An item'); end if;
    sub := sub + pr.price * (it->>'quantity')::int;
  end loop;
  if sub < s.min_order_amount then raise exception 'Minimum order is ₹%.', s.min_order_amount; end if;
  fee := case when sub >= s.free_delivery_threshold then 0 else s.delivery_fee end;
  insert into orders (customer_name, customer_phone, delivery_address, landmark, latitude, longitude, total_amount, delivery_fee)
    values (trim(p_name), p_phone, trim(p_address), p_landmark, p_lat, p_lng, sub + fee, fee) returning id into oid;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from products where id = (it->>'product_id')::uuid;
    insert into order_items (order_id, product_id, product_name, unit_price, quantity)
      values (oid, pr.id, pr.name || ' (' || pr.unit || ')', pr.price, (it->>'quantity')::int);
    update products set stock_quantity = stock_quantity - (it->>'quantity')::int where id = pr.id;
  end loop;
  return oid;
end $$;

-- Admin functions: every call must include the correct PIN.
create or replace function _chk(p_pin text) returns void language plpgsql security definer set search_path = public, extensions as $$
begin if not exists (select 1 from admin_secrets where pin_hash = crypt(coalesce(p_pin,''), pin_hash)) then raise exception 'Wrong PIN.'; end if; end $$;

create or replace function admin_orders(p_pin text) returns jsonb language plpgsql security definer set search_path = public as $$
begin perform _chk(p_pin);
  return coalesce((select jsonb_agg(to_jsonb(o) || jsonb_build_object('items', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from order_items i where i.order_id = o.id)) order by o.created_at desc) from orders o), '[]'::jsonb);
end $$;

create or replace function admin_set_status(p_pin text, p_id uuid, p_status text) returns boolean language plpgsql security definer set search_path = public as $$
begin perform _chk(p_pin); update orders set order_status = p_status where id = p_id; return true; end $$;

create or replace function admin_set_product(p_pin text, p jsonb) returns boolean language plpgsql security definer set search_path = public as $$
begin perform _chk(p_pin);
  insert into products (id, name, slug, category, unit, price, original_mrp, stock_quantity, image_url, is_active)
  values (coalesce((p->>'id')::uuid, gen_random_uuid()), p->>'name', p->>'slug', p->>'category', p->>'unit', (p->>'price')::numeric, (p->>'original_mrp')::numeric, (p->>'stock_quantity')::int, coalesce(p->>'image_url',''), coalesce((p->>'is_active')::boolean, true))
  on conflict (id) do update set name = excluded.name, category = excluded.category, unit = excluded.unit, price = excluded.price, original_mrp = excluded.original_mrp, stock_quantity = excluded.stock_quantity, image_url = excluded.image_url, is_active = excluded.is_active;
  return true; end $$;

create or replace function admin_delete_product(p_pin text, p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin perform _chk(p_pin);
  if exists (select 1 from order_items where product_id = p_id) then update products set is_active = false where id = p_id; -- archive: past orders still reference it
  else delete from products where id = p_id; end if; return true; end $$;

create or replace function admin_save_settings(p_pin text, p jsonb) returns boolean language plpgsql security definer set search_path = public as $$
begin perform _chk(p_pin);
  update site_settings set store_is_open = (p->>'store_is_open')::boolean, store_closed_message = p->>'store_closed_message', delivery_fee = (p->>'delivery_fee')::numeric,
    free_delivery_threshold = (p->>'free_delivery_threshold')::numeric, min_order_amount = (p->>'min_order_amount')::numeric, announcement_banner_text = p->>'announcement_banner_text',
    show_banner = (p->>'show_banner')::boolean, support_whatsapp_number = p->>'support_whatsapp_number', updated_at = now();
  return true; end $$;

revoke execute on function _chk(text) from public, anon, authenticated;
grant execute on function place_order, admin_orders, admin_set_status, admin_set_product, admin_delete_product, admin_save_settings to anon, authenticated;

-- Live stock and settings updates on the storefront
alter publication supabase_realtime add table products, site_settings;
