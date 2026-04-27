# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Supabase backend setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Create your local env file

   ```bash
   copy .env.example .env
   ```

3. Add your Supabase values to `.env`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3.1 Enable Google OAuth in Supabase

- Authentication -> Providers -> Google -> Enable
- Add your Google OAuth client ID and secret
- In Google Cloud OAuth client, add redirect URI: https://tvllpyqsvevhkcklowpj.supabase.co/auth/v1/callback
- Add redirect URL: `batbnb://auth/callback`
- Set Site URL: `batbnb://auth/callback`
- If using Expo Go, also add runtime redirect URL: `exp://.../--/auth/callback`

4. In Supabase SQL Editor, run these files in order:
   - `supabase/schema.sql`
   - `supabase/seed.sql`

   For an already initialized DB that only needs login throttling:
   - `supabase/auth-rate-limit.sql`

5. Use the configured client from `lib/supabase.ts` in your app code.

This project uses Supabase Auth for login/signup and includes a SQL-backed limiter
of 5 failed login attempts per email per 60 seconds.

For more details, see `supabase/README.md`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
