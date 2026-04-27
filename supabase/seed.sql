-- BatBnB initial seed data
-- Run this after supabase/schema.sql.

begin;

insert into public.listings (
  id,
  slug,
  title,
  subtitle,
  monthly_rent,
  location,
  latitude,
  longitude,
  meta,
  status,
  owner_id
)
values
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    'batstate-hub',
    'BatState Hub Dorm',
    'Clean, quiet, and optimized for student routines',
    4500,
    'Poblacion, Batangas City',
    13.7600,
    121.0550,
    '1 BR - 12 min to BSU',
    'active',
    null
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    'alangilan-suites',
    'Alangilan Student Suites',
    'Minimal layout with easy jeep access to campus',
    5000,
    'Alangilan, Batangas City',
    13.7500,
    121.0600,
    'Studio - near transport',
    'active',
    null
  )
on conflict (slug)
do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  monthly_rent = excluded.monthly_rent,
  location = excluded.location,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  meta = excluded.meta,
  status = excluded.status,
  owner_id = excluded.owner_id;

delete from public.listing_images
where listing_id in (
  '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
  '6d656381-4ffb-4f19-ac00-eecce35f4274'
);

insert into public.listing_images (listing_id, image_url, sort_order)
values
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1400&q=80',
    0
  ),
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1400&q=80',
    1
  ),
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
    2
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80',
    0
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80',
    1
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1400&q=80',
    2
  );

delete from public.listing_reviews
where listing_id in (
  '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
  '6d656381-4ffb-4f19-ac00-eecce35f4274'
);

insert into public.listing_reviews (listing_id, author_id, author_label, review_text)
values
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    null,
    'Kyla, 3rd Year',
    'Wi-Fi is stable enough for night classes. Usually 70 to 120 Mbps.'
  ),
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    null,
    'Marco, Engineering',
    'Water supply is okay. Best pressure from 6 AM to 10 PM.'
  ),
  (
    '871866e0-4f2c-4ce3-a53a-36e8a0a831f2',
    null,
    'Leah, BSIT',
    'Landlord responds quickly and does monthly maintenance checks.'
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    null,
    'Jules, 2nd Year',
    'Good ventilation and solid study desk setup.'
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    null,
    'Ria, Accountancy',
    'Commute is easy, and nearby karinderias are budget-friendly.'
  ),
  (
    '6d656381-4ffb-4f19-ac00-eecce35f4274',
    null,
    'Sean, CE',
    'Landlord allows flexible move-in dates for sem starts.'
  );

commit;
