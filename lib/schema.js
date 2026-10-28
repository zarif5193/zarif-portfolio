/**
 * Database schema definition + default seed content.
 * One definition, two dialects (SQLite/D1 and PostgreSQL).
 */

export const TABLES = {
  education: {
    label: 'শিক্ষা (Education)',
    order: 'sort_order ASC, id ASC',
    columns: {
      year: { type: 'text', label: 'সাল', placeholder: '2019' },
      title: { type: 'text', label: 'শিরোনাম', placeholder: 'PSC' },
      subtitle: { type: 'text', label: 'উপ-শিরোনাম', placeholder: 'প্রাথমিক শিক্ষা সমাপনী' },
      description: { type: 'textarea', label: 'বিবরণ' },
      sort_order: { type: 'int', label: 'ক্রম' },
      is_visible: { type: 'int', label: 'দেখাবে (1/0)', default: 1 },
    },
  },
  skills: {
    label: 'দক্ষতা (Skills)',
    order: 'sort_order ASC, id ASC',
    columns: {
      title: { type: 'text', label: 'শিরোনাম', placeholder: 'Web Design' },
      description: { type: 'textarea', label: 'বিবরণ' },
      sort_order: { type: 'int', label: 'ক্রম' },
      is_visible: { type: 'int', label: 'দেখাবে (1/0)', default: 1 },
    },
  },
  interests: {
    label: 'আগ্রহ (Interests)',
    order: 'sort_order ASC, id ASC',
    columns: {
      emoji: { type: 'text', label: 'ইমোজি', placeholder: '⚽' },
      label: { type: 'text', label: 'নাম', placeholder: 'Football' },
      sort_order: { type: 'int', label: 'ক্রম' },
      is_visible: { type: 'int', label: 'দেখাবে (1/0)', default: 1 },
    },
  },
  socials: {
    label: 'সোশ্যাল লিংক (Socials)',
    order: 'sort_order ASC, id ASC',
    columns: {
      label: { type: 'text', label: 'নাম', placeholder: 'Facebook' },
      url: { type: 'text', label: 'লিংক (URL)', placeholder: 'https://facebook.com/username' },
      icon: { type: 'select', label: 'আইকন', options: ['facebook', 'instagram', 'x', 'whatsapp', 'youtube', 'linkedin', 'github', 'telegram', 'tiktok', 'email', 'link'] },
      sort_order: { type: 'int', label: 'ক্রম' },
      is_visible: { type: 'int', label: 'দেখাবে (1/0)', default: 1 },
    },
  },
  phones: {
    label: 'ফোন নম্বর (Phones)',
    order: 'sort_order ASC, id ASC',
    columns: {
      label: { type: 'text', label: 'লেবেল', placeholder: 'PHONE' },
      number: { type: 'text', label: 'নম্বর', placeholder: '+880 1909-457050' },
      sort_order: { type: 'int', label: 'ক্রম' },
      is_visible: { type: 'int', label: 'দেখাবে (1/0)', default: 1 },
    },
  },
  messages: {
    label: 'মেসেজ (Inbox)',
    order: 'id DESC',
    readOnly: true,
    columns: {
      name: { type: 'text', label: 'নাম' },
      email: { type: 'text', label: 'ইমেইল' },
      phone: { type: 'text', label: 'ফোন' },
      message: { type: 'textarea', label: 'মেসেজ' },
      is_read: { type: 'int', label: 'পড়া হয়েছে', default: 0 },
      created_at: { type: 'text', label: 'সময়' },
    },
  },
};

/** Editable site texts. Rendered automatically in the admin panel. */
export const SETTINGS_FIELDS = [
  { key: 'site_title', label: 'ব্রাউজার টাইটেল', type: 'text', group: 'বেসিক' },
  { key: 'meta_description', label: 'SEO ডেসক্রিপশন', type: 'textarea', group: 'বেসিক' },
  { key: 'brand', label: 'নেভবার ব্র্যান্ড নাম', type: 'text', group: 'বেসিক' },
  { key: 'hero_kicker', label: 'হিরো ছোট লেখা', type: 'text', group: 'হিরো' },
  { key: 'hero_name', label: 'নাম', type: 'text', group: 'হিরো' },
  { key: 'hero_tagline', label: 'ট্যাগলাইন', type: 'text', group: 'হিরো' },
  { key: 'hero_desc', label: 'হিরো বর্ণনা', type: 'textarea', group: 'হিরো' },
  { key: 'hero_cta_1', label: 'বাটন ১ লেখা', type: 'text', group: 'হিরো' },
  { key: 'hero_cta_2', label: 'বাটন ২ লেখা', type: 'text', group: 'হিরো' },
  { key: 'hero_meta_1', label: 'ছোট ব্যাজ ১', type: 'text', group: 'হিরো' },
  { key: 'hero_meta_2', label: 'ছোট ব্যাজ ২', type: 'text', group: 'হিরো' },
  { key: 'photo_url', label: 'প্রোফাইল ছবি', type: 'image', group: 'হিরো' },
  { key: 'marquee_text', label: 'স্ক্রলিং স্ট্রিপ (কমা দিয়ে আলাদা)', type: 'text', group: 'হিরো' },
  { key: 'about_heading', label: 'About শিরোনাম', type: 'text', group: 'About' },
  { key: 'about_body', label: 'About মূল লেখা', type: 'textarea', group: 'About' },
  { key: 'about_note', label: 'About শেষ লাইন', type: 'textarea', group: 'About' },
  { key: 'stat_1', label: 'স্ট্যাট ১ (সংখ্যা)', type: 'text', group: 'About' },
  { key: 'stat_1_label', label: 'স্ট্যাট ১ লেবেল', type: 'text', group: 'About' },
  { key: 'stat_2', label: 'স্ট্যাট ২ (সংখ্যা)', type: 'text', group: 'About' },
  { key: 'stat_2_label', label: 'স্ট্যাট ২ লেবেল', type: 'text', group: 'About' },
  { key: 'stat_3', label: 'স্ট্যাট ৩ (সংখ্যা)', type: 'text', group: 'About' },
  { key: 'stat_3_label', label: 'স্ট্যাট ৩ লেবেল', type: 'text', group: 'About' },
  { key: 'experience_heading', label: 'Experience শিরোনাম', type: 'text', group: 'Experience' },
  { key: 'experience_body', label: 'Experience লেখা', type: 'textarea', group: 'Experience' },
  { key: 'future_heading', label: 'Future Goal শিরোনাম', type: 'text', group: 'Future' },
  { key: 'future_body', label: 'Future Goal লেখা', type: 'textarea', group: 'Future' },
  { key: 'quote', label: 'উক্তি (Quote)', type: 'textarea', group: 'Future' },
  { key: 'contact_heading', label: 'Contact শিরোনাম', type: 'text', group: 'Contact' },
  { key: 'contact_intro', label: 'Contact বর্ণনা', type: 'textarea', group: 'Contact' },
  { key: 'footer_note', label: 'ফুটার লেখা', type: 'text', group: 'Contact' },
];

export const DEFAULT_SETTINGS = {
  site_title: 'MD. Zarif Hasan | Personal Portfolio',
  meta_description: 'MD. Zarif Hasan — শিক্ষার্থী, প্রযুক্তিপ্রেমী ও সৃজনশীল মানুষ। Dream. Learn. Create. Become.',
  brand: 'Zarif Hasan',
  hero_kicker: 'PERSONAL PORTFOLIO • 2026',
  hero_name: 'MD. Zarif Hasan',
  hero_tagline: 'Dream. Learn. Create. Become.',
  hero_desc: 'একজন শিক্ষার্থী, প্রযুক্তিপ্রেমী ও সৃজনশীল মানুষ—নিজেকে গড়ে তোলার পথে প্রতিদিন এক ধাপ এগিয়ে চলছি।',
  hero_cta_1: 'আমার সম্পর্কে',
  hero_cta_2: 'যোগাযোগ করুন',
  hero_meta_1: '২০০৬ • জন্ম যশোরে',
  hero_meta_2: 'HSC শিক্ষার্থী • ২০২৭',
  photo_url: '/zarif.jpg',
  marquee_text: 'Web Design, Graphic Design, Video Editing, Photography, Technology, Football, Gaming, Writing',
  about_heading: 'আমার জীবনবৃত্তান্ত',
  about_body:
    'আমি যারীফ। জন্ম আমার ২২ ডিসেম্বর ২০০৬ সালে, যশোরের একটি স্বনামধন্য হাসপাতালে।\n\nশৈশব থেকেই যশোরের মাটি, প্রকৃতি ও মানুষের সহজ-সরল জীবনযাত্রার মধ্যেই আমার বেড়ে ওঠা। আমার স্থায়ী ঠিকানা যশোর জেলার মনিরামপুর উপজেলায়—এই মাটির সঙ্গে জড়িয়ে আছে আমার শৈশবের অসংখ্য স্মৃতি, স্বপ্ন এবং জীবনের প্রথম গল্পগুলো।\n\nজীবনকে আমি শুধু সময়ের প্রবাহ হিসেবে দেখি না; বরং প্রতিটি দিনকে নতুন কিছু শেখার, নিজেকে আবিষ্কার করার এবং আগামী দিনের জন্য নিজেকে আরও একটু প্রস্তুত করার সুযোগ হিসেবে দেখি।',
  about_note:
    'আমার বিশ্বাস, একজন মানুষের প্রকৃত পরিচয় শুধু তার নাম কিংবা পরিচয়ে নয়—তার চিন্তা, কাজ, মূল্যবোধ এবং স্বপ্নের মধ্যেই তার আসল পরিচয় লুকিয়ে থাকে।',
  stat_1: '2006',
  stat_1_label: 'জন্মসাল',
  stat_2: '05',
  stat_2_label: 'দক্ষতার ক্ষেত্র',
  stat_3: '2027',
  stat_3_label: 'HSC লক্ষ্য',
  experience_heading: 'অভিজ্ঞতা ও কাজ',
  experience_body:
    'আমার পথচলা এখনো দীর্ঘ নয়, তবে শেখার অভিজ্ঞতা কম নয়। পড়াশোনার পাশাপাশি প্রযুক্তি ও সৃজনশীলতার জগতে নিজেকে ধীরে ধীরে তৈরি করার চেষ্টা করছি। বিভিন্ন ডিজিটাল প্রজেক্ট, অনলাইন কনটেন্ট এবং ব্যক্তিগত উদ্যোগের মাধ্যমে বাস্তব অভিজ্ঞতা অর্জনের চেষ্টা করি।\n\nআমি বিশ্বাস করি, অভিজ্ঞতা শুধু কোনো প্রতিষ্ঠানে কাজ করার মাধ্যমে অর্জিত হয় না। নিজের একটি ছোট্ট প্রজেক্ট তৈরি করা, কোনো সমস্যার সমাধান খোঁজা কিংবা নতুন কোনো বিষয় নিজে নিজে শেখার মধ্যেও অভিজ্ঞতার জন্ম হয়।',
  future_heading: 'আমার সামনে অনেক দূরের পথ।',
  future_body:
    'আমার স্বপ্ন কোনো একটি নির্দিষ্ট জায়গায় গিয়ে থেমে যাওয়া নয়। জ্ঞান, প্রযুক্তি, সৃজনশীলতা ও নিজের পরিশ্রমকে কাজে লাগিয়ে ভবিষ্যতে একটি সম্মানজনক অবস্থান তৈরি করতে চাই।',
  quote: 'যে মানুষ নিজের স্বপ্নকে সত্যি করার জন্য প্রতিদিন একটু একটু করে এগিয়ে যায়, একদিন না একদিন তার পথ ঠিকই গন্তব্যের কাছে পৌঁছে যায়।',
  contact_heading: 'চলুন যোগাযোগ করি',
  contact_intro: 'কোনো কথা, কাজ বা সহযোগিতার জন্য সরাসরি যোগাযোগ করতে পারেন।',
  footer_note: 'Designed & built with care in Jashore, Bangladesh.',
};

export const DEFAULT_ROWS = {
  education: [
    { year: '2019', title: 'PSC', subtitle: 'প্রাথমিক শিক্ষা সমাপনী', description: '', sort_order: 1, is_visible: 1 },
    { year: '2022', title: 'JSC', subtitle: 'জুনিয়র স্কুল সার্টিফিকেট', description: '', sort_order: 2, is_visible: 1 },
    { year: '2025', title: 'SSC', subtitle: 'মাধ্যমিক স্কুল সার্টিফিকেট', description: '', sort_order: 3, is_visible: 1 },
    { year: '2027', title: 'HSC', subtitle: 'উচ্চমাধ্যমিক', description: 'বর্তমান শিক্ষাজীবনের লক্ষ্য', sort_order: 4, is_visible: 1 },
  ],
  skills: [
    { title: 'Computer / ICT', description: 'কম্পিউটার ও ডিজিটাল প্রযুক্তি নিয়ে কাজ ও শেখার আগ্রহ।', sort_order: 1, is_visible: 1 },
    { title: 'Web Design', description: 'আধুনিক, responsive ও user-friendly ওয়েবসাইট তৈরির প্রতি আগ্রহ।', sort_order: 2, is_visible: 1 },
    { title: 'Graphic Design', description: 'ভিজ্যুয়াল আইডিয়াকে সুন্দর ও সৃজনশীল ডিজাইনে রূপ দেওয়ার চেষ্টা।', sort_order: 3, is_visible: 1 },
    { title: 'Video Editing', description: 'ডিজিটাল কনটেন্ট ও ভিডিওকে আরও আকর্ষণীয় করে তোলার আগ্রহ।', sort_order: 4, is_visible: 1 },
    { title: 'Communication', description: 'মানুষের সঙ্গে সুন্দরভাবে যোগাযোগ ও নিজের ভাবনা প্রকাশের দক্ষতা।', sort_order: 5, is_visible: 1 },
  ],
  interests: [
    { emoji: '⚽', label: 'Football', sort_order: 1, is_visible: 1 },
    { emoji: '🎮', label: 'Gaming', sort_order: 2, is_visible: 1 },
    { emoji: '📷', label: 'Photography', sort_order: 3, is_visible: 1 },
    { emoji: '✍️', label: 'Writing', sort_order: 4, is_visible: 1 },
    { emoji: '💻', label: 'Technology', sort_order: 5, is_visible: 1 },
    { emoji: '✨', label: 'Creative Work', sort_order: 6, is_visible: 1 },
  ],
  socials: [
    { label: 'Facebook', url: 'https://www.facebook.com/zarifhasan5193', icon: 'facebook', sort_order: 1, is_visible: 1 },
    { label: 'Instagram', url: 'https://www.instagram.com/m.d.zarifhasan/', icon: 'instagram', sort_order: 2, is_visible: 1 },
    { label: 'X / Twitter', url: 'https://x.com/hasanzarif339', icon: 'x', sort_order: 3, is_visible: 1 },
    { label: 'WhatsApp', url: 'https://wa.me/8801909457050', icon: 'whatsapp', sort_order: 4, is_visible: 1 },
  ],
  phones: [
    { label: 'PHONE', number: '+880 1909-457050', sort_order: 1, is_visible: 1 },
    { label: 'PHONE', number: '+880 1951-934609', sort_order: 2, is_visible: 1 },
  ],
};

/* ------------------------------------------------------------------- DDL */

const colSql = (dialect, name, def) => {
  const t = def.type;
  if (t === 'int') return `"${name}" INTEGER DEFAULT ${def.default ?? 0}`;
  if (t === 'textarea') return `"${name}" TEXT`;
  if (t === 'select') return `"${name}" TEXT`;
  return `"${name}" TEXT`;
};

export function ddlFor(dialect) {
  const pk = dialect === 'postgres' ? '"id" SERIAL PRIMARY KEY' : '"id" INTEGER PRIMARY KEY AUTOINCREMENT';
  const statements = [];
  statements.push(`CREATE TABLE IF NOT EXISTS "settings" ("key" TEXT PRIMARY KEY, "value" TEXT)`);
  for (const [name, table] of Object.entries(TABLES)) {
    const cols = Object.entries(table.columns).map(([c, d]) => colSql(dialect, c, d));
    statements.push(`CREATE TABLE IF NOT EXISTS "${name}" (${[pk, ...cols].join(', ')})`);
  }
  return statements;
}
