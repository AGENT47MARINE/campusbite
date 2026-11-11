# CampusBite

SRM campus canteen ordering agent. Students order food in plain English; the agent checks the menu, wallet and pickup slots, then places the order. A kitchen screen shows live orders.

**Stack:** Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase · Gemini function calling · Zod · Vercel

## Features

- Passcode login (`proxy.ts`) protecting the app and Gemini quota
- Chat agent with tools: `getMenu`, `getWalletBalance`, `getPickupSlots`, `getMyOrders`, `placeOrder`, `cancelOrder` (`lib/agent/tools.ts`)
- Orders and cancellations go through the database functions `place_order` and `cancel_order` (never direct wallet/stock updates)
- Student screen (`/`): chat, wallet, orders, live menu
- Kitchen screen (`/kitchen`): placed → preparing → ready → collected
- The logged-in student is always `S001`

## Setup

1. `npm install` (Node 20+)
2. In the Supabase SQL Editor run `seed/00_starter_example.sql`, then `seed/campusbite.sql` (use `seed/menu-items.sql` to re-add missing menu items)
3. Copy `.env.example` to `.env.local` and fill in all values
4. `npm run dev` and open http://localhost:3000

## Deploy (Vercel)

Add the same environment variables in project settings, then deploy. Open `/api/health` to check settings and the database.
Keep `GEMINI_MODEL=gemini-3.6-flash` (or unset it). Slow models make the agent exceed Vercel's time limit and cause 504 errors.

## Folder guide

```
app/            pages (/, /kitchen, /login) and API routes
components/     AgentChat, MenuPanel, WalletOrders
lib/agent/      agent loop, tools, system prompt
lib/            supabase, gemini, env, auth helpers
seed/           SQL for the database
```
