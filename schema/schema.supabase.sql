-- ============================================================
--  MD. Zarif Hasan — Portfolio schema for SUPABASE
--  ------------------------------------------------------------
--  কীভাবে চালাবেন:
--    1. https://supabase.com/dashboard → আপনার প্রজেক্ট
--    2. বাঁ দিকের মেনু থেকে "SQL Editor" → "New query"
--    3. এই পুরো ফাইলটি পেস্ট করে "Run" চাপুন
--
--  ⚠️ এই ফাইলটি আগের সব টেবিল মুছে (DROP) নতুন করে বানাবে।
--     তাই পুরনো ডেটা থাকলে আগে ব্যাকআপ নিয়ে নিন।
-- ============================================================

-- ---------- পুরনো টেবিল মুছে ফেলা ----------
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.phones CASCADE;
DROP TABLE IF EXISTS public.socials CASCADE;
DROP TABLE IF EXISTS public.interests CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.education CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- ---------- নতুন টেবিল ----------
CREATE TABLE public.settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE public.education (
  id          SERIAL PRIMARY KEY,
  year        TEXT,
  title       TEXT,
  subtitle    TEXT,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_visible  INTEGER DEFAULT 1
);

CREATE TABLE public.skills (
  id          SERIAL PRIMARY KEY,
  title       TEXT,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_visible  INTEGER DEFAULT 1
);

CREATE TABLE public.interests (
  id         SERIAL PRIMARY KEY,
  emoji      TEXT,
  label      TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1
);

CREATE TABLE public.socials (
  id         SERIAL PRIMARY KEY,
  label      TEXT,
  url        TEXT,
  icon       TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1
);

CREATE TABLE public.phones (
  id         SERIAL PRIMARY KEY,
  label      TEXT,
  number     TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1
);

CREATE TABLE public.messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  phone      TEXT,
  message    TEXT,
  is_read    INTEGER DEFAULT 0,
  created_at TEXT
);

-- ---------- Row Level Security ----------
-- সাইটের ডেটা পাবলিকली পড়া যাবে (anon key দিয়ে)।
-- লেখার কাজ শুধু Worker করে — secret key / service_role দিয়ে, যা RLS বাইপাস করে।
ALTER TABLE public.settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read settings"  ON public.settings  FOR SELECT USING (true);
CREATE POLICY "public read education" ON public.education FOR SELECT USING (true);
CREATE POLICY "public read skills"    ON public.skills    FOR SELECT USING (true);
CREATE POLICY "public read interests" ON public.interests FOR SELECT USING (true);
CREATE POLICY "public read socials"   ON public.socials   FOR SELECT USING (true);
CREATE POLICY "public read phones"    ON public.phones    FOR SELECT USING (true);

-- কন্টাক্ট ফর্ম যাতে সরাসরি সাইট থেকেও কাজ করে (ঐচ্ছিক):
CREATE POLICY "public can send message" ON public.messages FOR INSERT WITH CHECK (true);
-- মেসেজ পড়া/এডিট শুধু Worker (secret key) করতে পারবে — anon পড়তে পারবে না।

-- ---------- ডিফল্ট ডেটা ----------
INSERT INTO public.settings (key, value) VALUES
  ('site_title', 'MD. Zarif Hasan | Personal Portfolio'),
  ('meta_description', 'MD. Zarif Hasan — শিক্ষার্থী, প্রযুক্তিপ্রেমী ও সৃজনশীল মানুষ। Dream. Learn. Create. Become.'),
  ('brand', 'Zarif Hasan'),
  ('hero_kicker', 'PERSONAL PORTFOLIO • 2026'),
  ('hero_name', 'MD. Zarif Hasan'),
  ('hero_tagline', 'Dream. Learn. Create. Become.'),
  ('hero_desc', 'একজন শিক্ষার্থী, প্রযুক্তিপ্রেমী ও সৃজনশীল মানুষ—নিজেকে গড়ে তোলার পথে প্রতিদিন এক ধাপ এগিয়ে চলছি।'),
  ('hero_cta_1', 'আমার সম্পর্কে'),
  ('hero_cta_2', 'যোগাযোগ করুন'),
  ('hero_meta_1', '২০০৬ • জন্ম যশোরে'),
  ('hero_meta_2', 'HSC শিক্ষার্থী • ২০২৭'),
  ('photo_url', '/zarif.jpg'),
  ('marquee_text', 'Web Design, Graphic Design, Video Editing, Photography, Technology, Football, Gaming, Writing'),
  ('about_heading', 'আমার জীবনবৃত্তান্ত'),
  ('about_body', 'আমি যারীফ। জন্ম আমার ২২ ডিসেম্বর ২০০৬ সালে, যশোরের একটি স্বনামধন্য হাসপাতালে।

শৈশব থেকেই যশোরের মাটি, প্রকৃতি ও মানুষের সহজ-সরল জীবনযাত্রার মধ্যেই আমার বেড়ে ওঠা। আমার স্থায়ী ঠিকানা যশোর জেলার মনিরামপুর উপজেলায়—এই মাটির সঙ্গে জড়িয়ে আছে আমার শৈশবের অসংখ্য স্মৃতি, স্বপ্ন এবং জীবনের প্রথম গল্পগুলো।

জীবনকে আমি শুধু সময়ের প্রবাহ হিসেবে দেখি না; বরং প্রতিটি দিনকে নতুন কিছু শেখার, নিজেকে আবিষ্কার করার এবং আগামী দিনের জন্য নিজেকে আরও একটু প্রস্তুত করার সুযোগ হিসেবে দেখি।'),
  ('about_note', 'আমার বিশ্বাস, একজন মানুষের প্রকৃত পরিচয় শুধু তার নাম কিংবা পরিচয়ে নয়—তার চিন্তা, কাজ, মূল্যবোধ এবং স্বপ্নের মধ্যেই তার আসল পরিচয় লুকিয়ে থাকে।'),
  ('stat_1', '2006'), ('stat_1_label', 'জন্মসাল'),
  ('stat_2', '05'),   ('stat_2_label', 'দক্ষতার ক্ষেত্র'),
  ('stat_3', '2027'), ('stat_3_label', 'HSC লক্ষ্য'),
  ('experience_heading', 'অভিজ্ঞতা ও কাজ'),
  ('experience_body', 'আমার পথচলা এখনো দীর্ঘ নয়, তবে শেখার অভিজ্ঞতা কম নয়। পড়াশোনার পাশাপাশি প্রযুক্তি ও সৃজনশীলতার জগতে নিজেকে ধীরে ধীরে তৈরি করার চেষ্টা করছি। বিভিন্ন ডিজিটাল প্রজেক্ট, অনলাইন কনটেন্ট এবং ব্যক্তিগত উদ্যোগের মাধ্যমে বাস্তব অভিজ্ঞতা অর্জনের চেষ্টা করি।

আমি বিশ্বাস করি, অভিজ্ঞতা শুধু কোনো প্রতিষ্ঠানে কাজ করার মাধ্যমে অর্জিত হয় না। নিজের একটি ছোট্ট প্রজেক্ট তৈরি করা, কোনো সমস্যার সমাধান খোঁজা কিংবা নতুন কোনো বিষয় নিজে নিজে শেখার মধ্যেও অভিজ্ঞতার জন্ম হয়।'),
  ('future_heading', 'আমার সামনে অনেক দূরের পথ।'),
  ('future_body', 'আমার স্বপ্ন কোনো একটি নির্দিষ্ট জায়গায় গিয়ে থেমে যাওয়া নয়। জ্ঞান, প্রযুক্তি, সৃজনশীলতা ও নিজের পরিশ্রমকে কাজে লাগিয়ে ভবিষ্যতে একটি সম্মানজনক অবস্থান তৈরি করতে চাই।'),
  ('quote', 'যে মানুষ নিজের স্বপ্নকে সত্যি করার জন্য প্রতিদিন একটু একটু করে এগিয়ে যায়, একদিন না একদিন তার পথ ঠিকই গন্তব্যের কাছে পৌঁছে যায়।'),
  ('contact_heading', 'চলুন যোগাযোগ করি'),
  ('contact_intro', 'কোনো কথা, কাজ বা সহযোগিতার জন্য সরাসরি যোগাযোগ করতে পারেন।'),
  ('footer_note', 'Designed & built with care in Jashore, Bangladesh.');

INSERT INTO public.education (year, title, subtitle, description, sort_order, is_visible) VALUES
  ('2019', 'PSC', 'প্রাথমিক শিক্ষা সমাপনী', '', 1, 1),
  ('2022', 'JSC', 'জুনিয়র স্কুল সার্টিফিকেট', '', 2, 1),
  ('2025', 'SSC', 'মাধ্যমিক স্কুল সার্টিফিকেট', '', 3, 1),
  ('2027', 'HSC', 'উচ্চমাধ্যমিক', 'বর্তমান শিক্ষাজীবনের লক্ষ্য', 4, 1);

INSERT INTO public.skills (title, description, sort_order, is_visible) VALUES
  ('Computer / ICT', 'কম্পিউটার ও ডিজিটাল প্রযুক্তি নিয়ে কাজ ও শেখার আগ্রহ।', 1, 1),
  ('Web Design', 'আধুনিক, responsive ও user-friendly ওয়েবসাইট তৈরির প্রতি আগ্রহ।', 2, 1),
  ('Graphic Design', 'ভিজ্যুয়াল আইডিয়াকে সুন্দর ও সৃজনশীল ডিজাইনে রূপ দেওয়ার চেষ্টা।', 3, 1),
  ('Video Editing', 'ডিজিটাল কনটেন্ট ও ভিডিওকে আরও আকর্ষণীয় করে তোলার আগ্রহ।', 4, 1),
  ('Communication', 'মানুষের সঙ্গে সুন্দরভাবে যোগাযোগ ও নিজের ভাবনা প্রকাশের দক্ষতা।', 5, 1);

INSERT INTO public.interests (emoji, label, sort_order, is_visible) VALUES
  ('⚽', 'Football', 1, 1),
  ('🎮', 'Gaming', 2, 1),
  ('📷', 'Photography', 3, 1),
  ('✍️', 'Writing', 4, 1),
  ('💻', 'Technology', 5, 1),
  ('✨', 'Creative Work', 6, 1);

INSERT INTO public.socials (label, url, icon, sort_order, is_visible) VALUES
  ('Facebook', 'https://www.facebook.com/zarifhasan5193', 'facebook', 1, 1),
  ('Instagram', 'https://www.instagram.com/m.d.zarifhasan/', 'instagram', 2, 1),
  ('X / Twitter', 'https://x.com/hasanzarif339', 'x', 3, 1),
  ('WhatsApp', 'https://wa.me/8801909457050', 'whatsapp', 4, 1);

INSERT INTO public.phones (label, number, sort_order, is_visible) VALUES
  ('PHONE', '+880 1909-457050', 1, 1),
  ('PHONE', '+880 1951-934609', 2, 1);

-- ---------- শেষ ----------
SELECT 'Zarif portfolio schema ready ✓' AS result;
