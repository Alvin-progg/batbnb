# Supabase Setup

## 1) Create a Supabase project

1. Go to https://supabase.com and create a project.
2. Copy your project URL and anon key from Project Settings -> API.

## 2) Configure environment variables

1. Duplicate `.env.example` as `.env`.
2. Set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 2.1) Enable OAuth provider (Google)

In Supabase Dashboard:

1. Go to Authentication -> Providers -> Google.
2. Enable Google provider.
3. Add your Google OAuth client ID and secret.
4. In Google Cloud Console OAuth client settings, add Authorized redirect URI:

- `https://tvllpyqsvevhkcklowpj.supabase.co/auth/v1/callback`

5. In Authentication -> URL Configuration -> Redirect URLs, add:

- `batbnb://auth/callback`

6. Set Site URL to:

- `batbnb://auth/callback`

If testing in Expo Go, also add the exact runtime redirect URL from your app
(usually `exp://<ip>:<port>/--/auth/callback`) to Redirect URLs.

The app uses this redirect URI for native OAuth callback handling.

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
- OAuth account creation/sign-in is available via Google from the login screen.

## Troubleshooting: "This site can't be reached"

This usually means Supabase fell back to an unreachable URL (often localhost)
because the redirect URL was not allow-listed.

Verify all of these:

1. Google Authorized redirect URI is exactly:

- `https://tvllpyqsvevhkcklowpj.supabase.co/auth/v1/callback`

2. Supabase Redirect URLs include:

- `batbnb://auth/callback`
- Expo Go runtime URL (`exp://.../--/auth/callback`) when using Expo Go

3. Supabase Site URL is not localhost; use:

- `batbnb://auth/callback`
