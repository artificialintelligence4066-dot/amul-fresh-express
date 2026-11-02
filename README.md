# 🥛 Amul Fresh Express

A modern dairy supply and quick-commerce web application designed for seamless daily dairy delivery and inventory management.

🔗 **Live Demo:** [amul-fresh-express.vercel.app](https://amul-fresh-express.vercel.app)

---

## ✨ Features

- **Customer Storefront (`/`):** Fast, clean, and responsive UI for browsing dairy products and placing orders.
- **Admin Dashboard (`/admin`):** Secure panel to manage inventory, track orders, and update product details.
- **Robust Security:** Row-level and PIN-based verification backed directly by Supabase PostgreSQL.
- **Fluid UI & Animations:** Built with Tailwind CSS and Framer Motion for a smooth shopping experience.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend & Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel

---

## 🚀 Setup & Installation

### 1. Database Setup (Supabase)
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** → Paste the contents of `supabase/migrations/001_amul_schema.sql` → Click **Run**.
3. Go to **Project Settings** → **API** → Copy the **Project URL** and the **anon public key**.

### 2. Run Locally
```bash
# Copy environment file
cp .env.example .env

# Fill in your Supabase credentials in .env:
# VITE_SUPABASE_URL=your_project_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Install dependencies
npm install

# Start development server
npm run dev
