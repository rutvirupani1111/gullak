-- Gullak v1 schema. Every table with shop_id has RLS enabled and forced in this same file.
create extension if not exists pgcrypto;
create extension if not exists citext;

create table owners (
  id uuid primary key default gen_random_uuid(),
  email citext unique, phone text unique,
  password_hash text not null, name text not null,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create table owner_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners on delete cascade,
  code_hash text not null, used_at timestamptz
);
create table owner_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners on delete cascade,
  token_hash bytea not null unique, expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null, name_local text, address text not null, city text not null,
  lat double precision, lng double precision,
  language text not null default 'hi' check (language in ('hi','en','hinglish')),
  palette text not null default 'haldi-press-red', initial text not null,
  keeper jsonb not null,
  timezone text not null default 'Asia/Kolkata',
  is_demo boolean not null default false, sandbox_expires_at timestamptz,
  stats_watermark timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table shop_keys (
  shop_id uuid not null references shops on delete cascade,
  kv int not null, public_key bytea not null, private_key_enc bytea not null,
  created_at timestamptz not null default now(), retired_at timestamptz,
  primary key (shop_id, kv)
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  name text not null, pin_hash text not null, pin_lookup bytea not null,
  failed_count int not null default 0, locked_until timestamptz,
  active boolean not null default true, created_at timestamptz not null default now(),
  unique (shop_id, pin_lookup)
);
create table staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff on delete cascade,
  shop_id uuid not null references shops on delete cascade,
  token_hash bytea not null unique, expires_at timestamptz not null
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  name text not null, title_hi text, title_en text,
  status text not null default 'draft' check (status in ('draft','live','paused','ended')),
  game text not null check (game in ('chakri','patti','toss')),
  starts_at timestamptz not null, ends_at timestamptz not null,
  open_minute smallint not null default 0, close_minute smallint not null default 1440,
  play_period text not null default 'day' check (play_period in ('day','week','campaign')),
  daily_budget_paise int not null check (daily_budget_paise >= 0),
  live_qr_required boolean not null default false, live_secret bytea not null default gen_random_bytes(32),
  strict_skill boolean not null default false, geofence_m int,
  sound text not null default 'bazaar',
  version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on campaigns (shop_id, status);

create table prizes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  campaign_id uuid not null references campaigns on delete cascade,
  label_hi text not null, label_en text not null,
  kind text not null check (kind in ('free_item','flat_off','pct_off','consolation','none')),
  value int not null default 0,
  cost_paise int not null default 0,
  weight int not null check (weight >= 0),
  tier smallint not null default 1 check (tier between 1 and 3),
  total_stock int, remaining int,
  daily_cap int, expiry_days int not null default 7, min_bill_paise int not null default 0,
  sort smallint not null default 0, active boolean not null default true,
  version int not null default 1,
  check (remaining is null or remaining >= 0),
  check (total_stock is not null or kind in ('consolation','none'))
);
create index on prizes (campaign_id) where active;

create table prize_daily (shop_id uuid not null references shops on delete cascade, prize_id uuid references prizes on delete cascade, day date, issued int not null default 0, primary key (prize_id, day));
create table campaign_daily (shop_id uuid not null references shops on delete cascade, campaign_id uuid references campaigns on delete cascade, day date, spent_paise int not null default 0, plays int not null default 0, primary key (campaign_id, day));

create table devices (
  id uuid primary key default gen_random_uuid(),
  coarse_hash bytea,
  merged_into uuid references devices,
  created_at timestamptz not null default now(), last_seen timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  device_id uuid references devices,
  first_name text, phone_enc bytea, phone_hash bytea,
  wa_opt_in boolean not null default false,
  consent_version text, consent_text_sha256 bytea, consent_at timestamptz,
  consent_lang text, consent_source text, consent_ip_hash bytea,
  last_sent_at timestamptz,
  deleted_at timestamptz, created_at timestamptz not null default now()
);
create unique index on customers (shop_id, phone_hash) where phone_hash is not null;

create table visits (
  shop_id uuid not null references shops on delete cascade,
  device_id uuid not null references devices,
  day date not null, first_at timestamptz not null default now(),
  primary key (shop_id, device_id, day)
);

create table plays (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  campaign_id uuid not null references campaigns on delete cascade,
  device_id uuid not null references devices, customer_id uuid references customers on delete set null,
  period_bucket text not null,
  idempotency_key uuid not null unique,
  prize_id uuid references prizes on delete set null, outcome text not null check (outcome in ('win','lose')),
  toss_hits smallint, layout jsonb, ip_hash bytea, created_at timestamptz not null default now(),
  unique (campaign_id, device_id, period_bucket)
);
create unique index plays_phone_period on plays (campaign_id, customer_id, period_bucket) where customer_id is not null;
create index on plays (shop_id, created_at);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  campaign_id uuid not null references campaigns on delete cascade,
  play_id uuid not null unique references plays on delete cascade, prize_id uuid not null references prizes on delete cascade,
  device_id uuid not null references devices, customer_id uuid references customers on delete set null,
  code char(7) not null, payload jsonb not null, sig bytea not null, kv int not null,
  cost_paise int not null default 0,
  issued_at timestamptz not null default now(), expires_at timestamptz not null,
  status text not null default 'issued' check (status in ('issued','redeemed','void')),
  unique (shop_id, code)
);
create index on coupons (device_id);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  coupon_id uuid not null references coupons on delete cascade, staff_id uuid references staff on delete set null,
  staff_name text,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  undone_at timestamptz, undone_by uuid
);
create unique index one_live_redemption on redemptions (coupon_id) where undone_at is null;

create table gift_slips (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  from_device uuid not null references devices, token_hash bytea not null unique,
  saved_by_device uuid references devices, used_play_id uuid references plays on delete set null,
  period_bucket text not null default '',
  created_at timestamptz not null default now(), expires_at timestamptz not null
);
create table comeback_tokens (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  token_hash bytea not null unique, created_at timestamptz not null default now(),
  sent_at timestamptz, used_play_id uuid references plays on delete set null, expires_at timestamptz not null
);
create table device_transfers (token_hash bytea primary key, from_device uuid not null references devices, expires_at timestamptz not null, claimed_by uuid references devices);

create table rate_buckets (key text primary key, tokens real not null, updated_at timestamptz not null default now());
create table pow_nonces (nonce text primary key, used_at timestamptz not null default now());
create table abuse_log (
  id bigserial primary key, shop_id uuid references shops on delete cascade, campaign_id uuid,
  reason text not null, device_id uuid, ip_hash bytea, detail jsonb, created_at timestamptz not null default now()
);

create table events (
  id bigserial, shop_id uuid not null, campaign_id uuid, device_id uuid,
  kind text not null check (kind in ('scan','open','play','win','redeem','undo','opt_in')),
  src text, paise int not null default 0, created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create index on events (shop_id, created_at);
create table events_2026_10 partition of events for values from ('2026-10-01') to ('2026-11-01');
create table events_2026_11 partition of events for values from ('2026-11-01') to ('2026-12-01');
create table events_2026_12 partition of events for values from ('2026-12-01') to ('2027-01-01');
create table events_2027_01 partition of events for values from ('2027-01-01') to ('2027-02-01');

create table shop_hourly_stats (
  shop_id uuid not null references shops on delete cascade, campaign_id uuid not null, hour timestamptz not null,
  scans int not null default 0, opens int not null default 0, plays int not null default 0,
  wins int not null default 0, redemptions int not null default 0,
  new_devices int not null default 0, returning_devices int not null default 0,
  paise_given bigint not null default 0,
  primary key (shop_id, campaign_id, hour)
);

-- Tenant isolation. A query sees a shop's rows only after withShop() sets app.shop_id;
-- the narrow cross-shop paths (wallet, demo clone, rollup, purge) set app.bypass inside one transaction.
do $$
declare t text; col text;
begin
  foreach t in array array['shops','shop_keys','staff','staff_sessions','campaigns','prizes','prize_daily','campaign_daily',
    'customers','visits','plays','coupons','redemptions','gift_slips','comeback_tokens','abuse_log','events','shop_hourly_stats']
  loop
    col := case when t = 'shops' then 'id' else 'shop_id' end;
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant on %I using ((%I = nullif(current_setting(''app.shop_id'', true), '''')::uuid) or current_setting(''app.bypass'', true) = ''on'') with check ((%I = nullif(current_setting(''app.shop_id'', true), '''')::uuid) or current_setting(''app.bypass'', true) = ''on'')', t, col, col);
  end loop;
  foreach t in array array['owners','owner_sessions','owner_recovery_codes','devices','rate_buckets','device_transfers','pow_nonces']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy bypass_only on %I using (current_setting(''app.bypass'', true) = ''on'') with check (current_setting(''app.bypass'', true) = ''on'')', t);
  end loop;
end $$;
