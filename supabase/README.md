# Supabase Setup

## 1) Create a Supabase project

1. Go to https://supabase.com and create a project.
2. Copy your project URL and anon key from Project Settings -> API.

## 2) Configure environment variables

1. Duplicate `.env.example` as `.env`.
2. Set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 3) Initialize database schema

In the Supabase SQL Editor, run:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

If your database is already initialized and you only want to add auth login throttling,
run `supabase/auth-rate-limit.sql`.

## 4) Use the client in app code

The app client is exported from `lib/supabase.ts`.

Example:

```ts
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase
  .from("listings")
  .select("id, slug, title, monthly_rent, latitude, longitude, meta")
  .eq("status", "active")
  .order("monthly_rent", { ascending: true });
```

## Notes

- This setup enables RLS by default with starter policies.
- Public browsing works for active listings, images, and reviews.
- Writes (saves, chats, owner listing management) require authenticated users.
- Login attempts are rate-limited to 5 failed attempts per email per 60 seconds.
