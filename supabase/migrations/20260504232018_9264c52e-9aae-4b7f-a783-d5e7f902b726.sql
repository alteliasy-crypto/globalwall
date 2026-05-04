
-- 1) Fix slot constraint on quest_ladder
ALTER TABLE public.quest_ladder DROP CONSTRAINT IF EXISTS quest_ladder_slot_check;
ALTER TABLE public.quest_ladder ADD CONSTRAINT quest_ladder_slot_check CHECK (slot >= 1 AND slot <= 20);

-- 2) Theme + equipped cosmetics on profile
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS equipped_badge text,
  ADD COLUMN IF NOT EXISTS equipped_fx text,
  ADD COLUMN IF NOT EXISTS equipped_frame text,
  ADD COLUMN IF NOT EXISTS equipped_font text;

-- 3) Shop catalog
CREATE TABLE IF NOT EXISTS public.shop_catalog (
  item_key text PRIMARY KEY,
  category text NOT NULL,        -- 'theme' | 'badge' | 'fx' | 'frame' | 'font' | 'boost'
  type text NOT NULL,            -- 'cosmetic' | 'boost'
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  coins int NOT NULL DEFAULT 0,
  tokens int NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',  -- common|rare|epic|legendary
  accent text NOT NULL DEFAULT 'from-slate-400 to-slate-600',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view shop" ON public.shop_catalog;
CREATE POLICY "Anyone can view shop" ON public.shop_catalog FOR SELECT TO authenticated USING (true);

-- 4) Seed 120+ items
TRUNCATE public.shop_catalog;
INSERT INTO public.shop_catalog (item_key, category, type, label, description, coins, tokens, rarity, accent, meta) VALUES
-- THEMES (20)
('theme_default','theme','cosmetic','Cork Classic','The original cork board',0,0,'common','from-amber-300 to-amber-500','{}'),
('theme_pastel','theme','cosmetic','Pastel Dream','Soft pastel cork board',400,0,'rare','from-pink-300 to-purple-400','{}'),
('theme_neon','theme','cosmetic','Neon Pulse','Vibrant neon wall',400,0,'rare','from-cyan-400 to-fuchsia-500','{}'),
('theme_midnight','theme','cosmetic','Midnight Ink','Deep navy aesthetic',500,0,'rare','from-slate-700 to-indigo-900','{}'),
('theme_sunset','theme','cosmetic','Sunset Boulevard','Warm orange/pink',450,0,'rare','from-orange-400 to-rose-500','{}'),
('theme_forest','theme','cosmetic','Forest Mist','Calm greens',450,0,'rare','from-emerald-500 to-teal-700','{}'),
('theme_ocean','theme','cosmetic','Ocean Wave','Cool blues',450,0,'rare','from-sky-400 to-blue-600','{}'),
('theme_lava','theme','cosmetic','Lava Flow','Hot reds and oranges',600,1,'epic','from-red-500 to-orange-600','{}'),
('theme_galaxy','theme','cosmetic','Galaxy Drift','Deep space vibes',700,1,'epic','from-purple-700 to-indigo-900','{}'),
('theme_cherry','theme','cosmetic','Cherry Blossom','Sakura pink',500,0,'rare','from-pink-400 to-rose-300','{}'),
('theme_aurora','theme','cosmetic','Aurora','Northern lights',800,2,'epic','from-green-400 via-cyan-400 to-purple-500','{}'),
('theme_matrix','theme','cosmetic','Matrix','Green code rain',650,1,'epic','from-green-600 to-emerald-900','{}'),
('theme_candy','theme','cosmetic','Candyland','Sweet pastels',500,0,'rare','from-pink-300 to-yellow-300','{}'),
('theme_steel','theme','cosmetic','Steel Forge','Industrial gray',400,0,'common','from-zinc-500 to-slate-700','{}'),
('theme_gold','theme','cosmetic','Gold Rush','Luxury gold',900,2,'legendary','from-yellow-400 to-amber-600','{}'),
('theme_ice','theme','cosmetic','Ice Crystal','Frozen blues',550,0,'rare','from-cyan-300 to-blue-400','{}'),
('theme_volcano','theme','cosmetic','Volcano','Molten rock',700,1,'epic','from-red-700 to-yellow-500','{}'),
('theme_meadow','theme','cosmetic','Meadow','Springtime green',400,0,'common','from-lime-400 to-green-500','{}'),
('theme_void','theme','cosmetic','The Void','Pure black',1000,3,'legendary','from-black to-zinc-900','{}'),
('theme_rainbow','theme','cosmetic','Rainbow Wall','All the colors',1200,3,'legendary','from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500','{}'),
-- BADGES (25)
('badge_gold','badge','cosmetic','Gold Badge','Shiny gold flex',600,1,'epic','from-yellow-400 to-amber-500','{}'),
('badge_diamond','badge','cosmetic','Diamond Badge','The ultimate flex',0,5,'legendary','from-cyan-300 to-blue-500','{}'),
('badge_silver','badge','cosmetic','Silver Badge','Classic silver',300,0,'rare','from-slate-300 to-slate-500','{}'),
('badge_bronze','badge','cosmetic','Bronze Badge','Starter badge',150,0,'common','from-amber-700 to-orange-800','{}'),
('badge_ruby','badge','cosmetic','Ruby Badge','Bold red gem',700,1,'epic','from-red-500 to-rose-700','{}'),
('badge_emerald','badge','cosmetic','Emerald Badge','Forest gem',700,1,'epic','from-emerald-400 to-green-600','{}'),
('badge_sapphire','badge','cosmetic','Sapphire Badge','Royal blue',700,1,'epic','from-blue-500 to-indigo-700','{}'),
('badge_obsidian','badge','cosmetic','Obsidian Badge','Volcanic glass',800,2,'legendary','from-slate-800 to-black','{}'),
('badge_pearl','badge','cosmetic','Pearl Badge','Iridescent white',500,0,'rare','from-slate-100 to-pink-100','{}'),
('badge_amethyst','badge','cosmetic','Amethyst','Purple gem',650,1,'epic','from-purple-400 to-violet-700','{}'),
('badge_topaz','badge','cosmetic','Topaz','Honey gold',550,0,'rare','from-yellow-300 to-orange-400','{}'),
('badge_jade','badge','cosmetic','Jade','Lucky green',500,0,'rare','from-green-300 to-emerald-500','{}'),
('badge_onyx','badge','cosmetic','Onyx','Pure black',600,1,'epic','from-black to-zinc-700','{}'),
('badge_crystal','badge','cosmetic','Crystal','Pure clarity',900,2,'legendary','from-white to-cyan-200','{}'),
('badge_phoenix','badge','cosmetic','Phoenix','Reborn in fire',1000,3,'legendary','from-orange-500 to-red-600','{}'),
('badge_wolf','badge','cosmetic','Lone Wolf','Pack of one',400,0,'rare','from-slate-500 to-zinc-700','{}'),
('badge_dragon','badge','cosmetic','Dragon','Ancient power',1100,3,'legendary','from-emerald-600 to-red-700','{}'),
('badge_lion','badge','cosmetic','Lion','King of wall',800,2,'epic','from-yellow-500 to-amber-700','{}'),
('badge_eagle','badge','cosmetic','Eagle','Soaring high',500,0,'rare','from-amber-600 to-stone-700','{}'),
('badge_owl','badge','cosmetic','Night Owl','Wisdom keeper',450,0,'common','from-stone-600 to-stone-900','{}'),
('badge_star','badge','cosmetic','Star','Shining bright',300,0,'common','from-yellow-300 to-amber-400','{}'),
('badge_moon','badge','cosmetic','Moon','Lunar grace',350,0,'common','from-slate-200 to-slate-400','{}'),
('badge_sun','badge','cosmetic','Sun','Radiant warmth',400,0,'common','from-yellow-400 to-orange-500','{}'),
('badge_comet','badge','cosmetic','Comet','Trail of glory',850,2,'epic','from-cyan-400 to-purple-600','{}'),
('badge_galaxy','badge','cosmetic','Galaxy Badge','Whole universe',1500,4,'legendary','from-indigo-600 via-purple-700 to-pink-600','{}'),
-- FX (25)
('fx_sparkle','fx','cosmetic','Sparkle FX','Sparkle on your notes',250,0,'common','from-yellow-300 to-amber-400','{}'),
('fx_confetti','fx','cosmetic','Confetti FX','Burst on pin',300,0,'rare','from-pink-400 to-rose-500','{}'),
('fx_glow_yellow','fx','cosmetic','Yellow Glow','Sunny halo',200,0,'common','from-yellow-200 to-yellow-400','{}'),
('fx_glow_pink','fx','cosmetic','Pink Glow','Rosy halo',200,0,'common','from-pink-200 to-pink-400','{}'),
('fx_glow_blue','fx','cosmetic','Blue Glow','Cool halo',200,0,'common','from-blue-200 to-blue-400','{}'),
('fx_glow_green','fx','cosmetic','Green Glow','Lush halo',200,0,'common','from-green-200 to-green-400','{}'),
('fx_glow_purple','fx','cosmetic','Purple Glow','Mystic halo',250,0,'rare','from-purple-300 to-purple-500','{}'),
('fx_glow_red','fx','cosmetic','Red Glow','Fiery halo',250,0,'rare','from-red-300 to-red-500','{}'),
('fx_glow_cyan','fx','cosmetic','Cyan Glow','Icy halo',250,0,'rare','from-cyan-300 to-cyan-500','{}'),
('fx_rainbow_glow','fx','cosmetic','Rainbow Glow','All colors',900,2,'legendary','from-red-400 via-yellow-300 via-green-400 to-purple-400','{}'),
('fx_fire','fx','cosmetic','Fire FX','Flickering flames',500,0,'rare','from-orange-500 to-red-600','{}'),
('fx_ice','fx','cosmetic','Ice FX','Frosty crystals',500,0,'rare','from-cyan-200 to-blue-400','{}'),
('fx_lightning','fx','cosmetic','Lightning FX','Electric crackle',650,1,'epic','from-yellow-300 to-blue-500','{}'),
('fx_smoke','fx','cosmetic','Smoke FX','Mysterious fog',400,0,'common','from-slate-400 to-slate-600','{}'),
('fx_bubbles','fx','cosmetic','Bubble FX','Bouncy bubbles',350,0,'common','from-cyan-200 to-blue-300','{}'),
('fx_stars','fx','cosmetic','Stars FX','Tiny stars',400,0,'common','from-yellow-200 to-purple-400','{}'),
('fx_hearts','fx','cosmetic','Hearts FX','Floating hearts',450,0,'rare','from-pink-300 to-red-400','{}'),
('fx_petals','fx','cosmetic','Petals FX','Falling petals',500,0,'rare','from-pink-200 to-rose-400','{}'),
('fx_snow','fx','cosmetic','Snow FX','Gentle snowfall',450,0,'rare','from-cyan-100 to-blue-200','{}'),
('fx_leaves','fx','cosmetic','Leaves FX','Autumn leaves',450,0,'rare','from-orange-400 to-yellow-600','{}'),
('fx_aura','fx','cosmetic','Aura FX','Mystical aura',700,1,'epic','from-purple-400 to-pink-500','{}'),
('fx_neon','fx','cosmetic','Neon FX','Glowing edges',600,1,'epic','from-fuchsia-500 to-cyan-400','{}'),
('fx_gold_dust','fx','cosmetic','Gold Dust','Falling gold',800,2,'legendary','from-yellow-400 to-amber-600','{}'),
('fx_constellation','fx','cosmetic','Constellation','Connected stars',1000,2,'legendary','from-indigo-400 to-purple-600','{}'),
('fx_void','fx','cosmetic','Void FX','Black hole vibes',1200,3,'legendary','from-black to-purple-900','{}'),
-- FRAMES (25)
('frame_wood','frame','cosmetic','Wood Frame','Rustic wood',150,0,'common','from-amber-700 to-amber-900','{}'),
('frame_gold','frame','cosmetic','Gold Frame','Royal gold border',500,0,'rare','from-yellow-400 to-amber-600','{}'),
('frame_silver','frame','cosmetic','Silver Frame','Sleek silver',350,0,'common','from-slate-300 to-slate-500','{}'),
('frame_neon','frame','cosmetic','Neon Frame','Glowing border',550,1,'epic','from-fuchsia-500 to-cyan-400','{}'),
('frame_marble','frame','cosmetic','Marble Frame','Carrara classic',450,0,'rare','from-slate-100 to-slate-400','{}'),
('frame_obsidian','frame','cosmetic','Obsidian Frame','Black mirror',600,1,'epic','from-zinc-800 to-black','{}'),
('frame_rosewood','frame','cosmetic','Rosewood Frame','Dark wood',300,0,'common','from-rose-900 to-red-950','{}'),
('frame_pine','frame','cosmetic','Pine Frame','Natural pine',200,0,'common','from-yellow-700 to-amber-800','{}'),
('frame_velvet','frame','cosmetic','Velvet Frame','Plush red',500,0,'rare','from-red-800 to-rose-900','{}'),
('frame_glass','frame','cosmetic','Glass Frame','Crystal clear',650,1,'epic','from-cyan-100 to-blue-200','{}'),
('frame_diamond','frame','cosmetic','Diamond Frame','Sparkling rim',1100,3,'legendary','from-cyan-300 to-blue-500','{}'),
('frame_ruby','frame','cosmetic','Ruby Frame','Red gem rim',700,1,'epic','from-red-500 to-rose-700','{}'),
('frame_sapphire','frame','cosmetic','Sapphire Frame','Blue gem rim',700,1,'epic','from-blue-500 to-indigo-700','{}'),
('frame_emerald','frame','cosmetic','Emerald Frame','Green gem rim',700,1,'epic','from-emerald-400 to-green-600','{}'),
('frame_holo','frame','cosmetic','Holo Frame','Holographic',900,2,'legendary','from-pink-300 via-cyan-300 to-purple-300','{}'),
('frame_pixel','frame','cosmetic','Pixel Frame','8-bit border',400,0,'rare','from-green-500 to-blue-600','{}'),
('frame_tape','frame','cosmetic','Washi Tape','Cute tape edges',250,0,'common','from-pink-300 to-purple-400','{}'),
('frame_polaroid','frame','cosmetic','Polaroid','Retro photo',350,0,'common','from-slate-100 to-slate-300','{}'),
('frame_vintage','frame','cosmetic','Vintage','Aged scroll',400,0,'rare','from-yellow-200 to-amber-400','{}'),
('frame_lace','frame','cosmetic','Lace Frame','Delicate lace',450,0,'rare','from-pink-100 to-rose-200','{}'),
('frame_chrome','frame','cosmetic','Chrome Frame','Mirror shine',550,1,'epic','from-slate-200 to-slate-500','{}'),
('frame_carbon','frame','cosmetic','Carbon Fiber','Tech mesh',500,0,'rare','from-zinc-700 to-zinc-900','{}'),
('frame_copper','frame','cosmetic','Copper Frame','Warm metal',400,0,'rare','from-orange-600 to-amber-700','{}'),
('frame_jade','frame','cosmetic','Jade Frame','Carved jade',650,1,'epic','from-emerald-300 to-green-500','{}'),
('frame_galactic','frame','cosmetic','Galactic Frame','Cosmic edge',1300,3,'legendary','from-indigo-700 via-purple-600 to-pink-500','{}'),
-- FONTS (15)
('font_handwritten','font','cosmetic','Handwritten','Default friendly',0,0,'common','from-amber-300 to-amber-500','{}'),
('font_marker','font','cosmetic','Marker','Bold marker pen',200,0,'common','from-red-400 to-red-600','{}'),
('font_typewriter','font','cosmetic','Typewriter','Vintage type',250,0,'common','from-slate-400 to-slate-600','{}'),
('font_bubble','font','cosmetic','Bubble','Round and fun',300,0,'rare','from-pink-300 to-purple-400','{}'),
('font_serif','font','cosmetic','Elegant Serif','Classy book font',300,0,'rare','from-stone-400 to-stone-700','{}'),
('font_pixel','font','cosmetic','Pixel','8-bit retro',400,0,'rare','from-green-500 to-blue-600','{}'),
('font_neon','font','cosmetic','Neon Glow','Glowing letters',500,0,'rare','from-fuchsia-500 to-cyan-400','{}'),
('font_chalk','font','cosmetic','Chalkboard','School chalk',250,0,'common','from-slate-200 to-slate-400','{}'),
('font_brush','font','cosmetic','Brush Stroke','Painted strokes',400,0,'rare','from-orange-400 to-red-500','{}'),
('font_calligraphy','font','cosmetic','Calligraphy','Fancy script',500,1,'epic','from-amber-500 to-amber-700','{}'),
('font_comic','font','cosmetic','Comic','Speech bubble',300,0,'common','from-yellow-300 to-orange-400','{}'),
('font_grunge','font','cosmetic','Grunge','Distressed',450,0,'rare','from-zinc-500 to-zinc-800','{}'),
('font_arcade','font','cosmetic','Arcade','Game over',500,1,'epic','from-purple-500 to-pink-500','{}'),
('font_royal','font','cosmetic','Royal','King''s font',700,1,'epic','from-purple-600 to-amber-500','{}'),
('font_cosmic','font','cosmetic','Cosmic','Out of this world',900,2,'legendary','from-indigo-500 via-purple-600 to-pink-500','{}'),
-- BOOSTS (10)
('boost_2x_30m','boost','boost','2x Coin Boost','Double coins for 30m',250,0,'common','from-amber-400 to-orange-500','{"mult":2.0,"minutes":30}'),
('boost_3x_15m','boost','boost','3x Mega Boost','Triple coins for 15m',0,2,'epic','from-fuchsia-500 to-rose-500','{"mult":3.0,"minutes":15}'),
('streak_shield','boost','boost','Streak Shield','Protect streak 2h',150,0,'common','from-blue-400 to-indigo-500','{"mult":1.0,"minutes":120}'),
('boost_1_5x_60m','boost','boost','1.5x Boost','1.5x coins for 1h',180,0,'common','from-amber-300 to-orange-400','{"mult":1.5,"minutes":60}'),
('boost_2x_2h','boost','boost','2x Long Boost','Double coins for 2h',600,1,'rare','from-amber-500 to-red-500','{"mult":2.0,"minutes":120}'),
('boost_5x_5m','boost','boost','5x Burst','Quintuple coins for 5m',0,3,'legendary','from-pink-500 to-purple-700','{"mult":5.0,"minutes":5}'),
('streak_shield_24h','boost','boost','Streak Shield XL','Protect streak 24h',800,1,'epic','from-blue-500 to-indigo-700','{"mult":1.0,"minutes":1440}'),
('boost_token_2x','boost','boost','Token Doubler','2x tokens for 30m',400,0,'rare','from-fuchsia-400 to-purple-600','{"mult":2.0,"minutes":30}'),
('boost_quest_3x_10m','boost','boost','Quest Frenzy','3x quest rewards 10m',0,2,'epic','from-orange-500 to-red-600','{"mult":3.0,"minutes":10}'),
('boost_combo_2x_45m','boost','boost','Combo Boost','2x rewards 45m',300,0,'rare','from-yellow-400 to-orange-500','{"mult":2.0,"minutes":45}');

-- 5) Rotation function: 15 deterministic items per 12-hour bucket
CREATE OR REPLACE FUNCTION public.get_shop_rotation()
RETURNS TABLE(
  item_key text, category text, type text, label text, description text,
  coins int, tokens int, rarity text, accent text, meta jsonb,
  rotates_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  bucket bigint := floor(extract(epoch from now()) / 43200);
  next_rotate timestamptz := to_timestamp((bucket + 1) * 43200);
BEGIN
  RETURN QUERY
  SELECT s.item_key, s.category, s.type, s.label, s.description,
         s.coins, s.tokens, s.rarity, s.accent, s.meta, next_rotate
  FROM public.shop_catalog s
  ORDER BY md5(s.item_key || bucket::text)
  LIMIT 15;
END;
$$;

-- 6) Rewrite purchase_market_item to use catalog
CREATE OR REPLACE FUNCTION public.purchase_market_item(_item_key text)
RETURNS TABLE(success boolean, message text, coins int, tokens int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_catalog%ROWTYPE;
  cur_coins int;
  cur_tokens int;
  mins int;
  mult numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO item FROM public.shop_catalog WHERE shop_catalog.item_key = _item_key;
  IF item.item_key IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown item', 0, 0; RETURN;
  END IF;

  SELECT uc.coins, uc.tokens INTO cur_coins, cur_tokens
    FROM public.user_currency uc WHERE uc.user_id = uid FOR UPDATE;

  IF item.type = 'cosmetic' AND EXISTS (
    SELECT 1 FROM public.cosmetics_owned co WHERE co.user_id = uid AND co.item_key = _item_key
  ) THEN
    RETURN QUERY SELECT false, 'Already owned', cur_coins, cur_tokens; RETURN;
  END IF;

  IF cur_coins < item.coins OR cur_tokens < item.tokens THEN
    RETURN QUERY SELECT false, 'Not enough currency', cur_coins, cur_tokens; RETURN;
  END IF;

  UPDATE public.user_currency uc
    SET coins = uc.coins - item.coins,
        tokens = uc.tokens - item.tokens,
        updated_at = now()
    WHERE uc.user_id = uid
    RETURNING uc.coins, uc.tokens INTO cur_coins, cur_tokens;

  IF item.type = 'cosmetic' THEN
    INSERT INTO public.cosmetics_owned (user_id, item_key) VALUES (uid, _item_key)
      ON CONFLICT DO NOTHING;
  ELSE
    mins := COALESCE((item.meta->>'minutes')::int, 30);
    mult := COALESCE((item.meta->>'mult')::numeric, 1.0);
    INSERT INTO public.active_boosts (user_id, boost_key, multiplier, expires_at)
    VALUES (uid, _item_key, mult, now() + (mins || ' minutes')::interval);
  END IF;

  RETURN QUERY SELECT true, 'Purchased: ' || item.label, cur_coins, cur_tokens;
END;
$$;

-- 7) Equip cosmetic RPC
CREATE OR REPLACE FUNCTION public.equip_cosmetic(_item_key text)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item public.shop_catalog%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  IF _item_key IS NOT NULL AND _item_key <> '' THEN
    SELECT * INTO item FROM public.shop_catalog WHERE shop_catalog.item_key = _item_key;
    IF item.item_key IS NULL THEN
      RETURN QUERY SELECT false, 'Unknown item'; RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cosmetics_owned co WHERE co.user_id = uid AND co.item_key = _item_key) THEN
      RETURN QUERY SELECT false, 'Not owned'; RETURN;
    END IF;
  END IF;

  INSERT INTO public.user_profiles (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  IF item.category = 'theme' OR _item_key IS NULL THEN
    UPDATE public.user_profiles SET theme = COALESCE(item.item_key, 'default'), updated_at = now() WHERE user_id = uid;
  END IF;
  IF item.category = 'badge' THEN
    UPDATE public.user_profiles SET equipped_badge = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'fx' THEN
    UPDATE public.user_profiles SET equipped_fx = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'frame' THEN
    UPDATE public.user_profiles SET equipped_frame = item.item_key, updated_at = now() WHERE user_id = uid;
  ELSIF item.category = 'font' THEN
    UPDATE public.user_profiles SET equipped_font = item.item_key, updated_at = now() WHERE user_id = uid;
  END IF;

  RETURN QUERY SELECT true, 'Equipped';
END;
$$;
