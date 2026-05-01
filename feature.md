# BatBnB - Features & Roadmap

BatBnB is a housing and dorm discovery platform tailored for Batangas State University students, built natively with Expo, React Native, and Supabase.

## 🚀 Current Features

### 1. Authentication & Security

- **Authentication Gate**: The entire application is protected behind a robust authentication gate. Unauthenticated users are naturally routed to the login screen.
- **Multiple Sign-in Methods**: Supports standard Email/Password and Google OAuth login flows.
- **Rate Limiting**: Custom Supabase PostgreSQL functions prevent brute-force attacks by limiting login attempts to 5 per minute per email.

### 2. Map-based Discovery (`/tabs/index`)

- **Interactive Map**: Built with `react-native-maps`, customized with a dark theme geometry to match the app's aesthetic.
- **Dynamic Pins**: Listings are dynamically pulled from the Supabase database and rendered as custom price tag pins on the map.
- **Expandable Drawer**: A sleek animated bottom drawer acts as a carousel for listings, minimizing to show the map and expanding to show list details.

### 3. Advanced Filtering & Search

- **Keyword Search**: Quick search by title or listing metadata (e.g., "1 BR", "Studio").
- **Budget Filters**: Granular `Min` and `Max` budget constraints in Philippine Pesos (₱).
- **Local Persistence**: Filter states are cached in `AsyncStorage` so students don't lose their exact search parameters when reloading the app or navigating away.

### 4. Property Details (`property/[id]`)

- **Rich Media Gallery**: Horizontal scroll view showcasing high-quality images of the property.
- **Full-screen Profiles**: Displays title, monthly rent, location, and a quick summary.
- **Social Proof & Reviews**: Renders student-reported feedback directly from the `listing_reviews` table to ensure transparency regarding internet speeds, water pressure, and landlord reliability.
- **Call to Action**: Direct "Message Renter" integration to start a line of communication.

### 5. Backend Architecture (Supabase)

- **PostgreSQL Database**: fully structured schema including `users`, `listings`, `listing_images`, `listing_reviews`, `saved_listings`, `chat_threads`, and `chat_messages`.
- **Row Level Security (RLS)**: Enforced database isolation so owners can manage their own listings while users can read active listings and participate in their chat threads securely.

---

## 🔮 Suggestions & Roadmap

Here are recommended features natively supported by your current database schema that can be implemented next:

### 🌟 1. Save/Favorite Listings

- **Concept**: Add a 'Heart' icon on the map cards and property details screen.
- **Implementation**: Tie this button to the already existing `saved_listings` table. Create a new Tab (`app/(tabs)/saved.tsx`) to display the user's bookmarked properties.

### 💬 2. Real-time In-App Messaging

- **Concept**: Fully flesh out the `app/chat.tsx` screen.
- **Implementation**: Utilize Supabase Realtime (WebSockets) to listen for new inserts on the `chat_messages` table, allowing students and landlords to negotiate rent and ask questions seamlessly inside the app.

### 🏠 3. Landlord Dashboard

- **Concept**: Allow property owners to post their own dorms.
- **Implementation**: Create a protected route specifically for users where `is_owner = true`. Add forms to submit new rows to the `listings` and `listing_images` table, including image uploading to Supabase Storage.

### ⭐ 4. Add a Review System

- **Concept**: Allow actual students to leave their feedback natively.
- **Implementation**: Add a "Write a Review" modal on the Property Details screen. It will insert into `listing_reviews` (which already has RLS policies configured to allow authenticated inserts).

### 📱 5. Push Notifications

- **Concept**: Notify students when a Landlord replies to their chat, or when a saved listing drops in price.
- **Implementation**: Integrate `expo-notifications` with Supabase Edge Functions / Webhooks to trigger background alerts to devices.

