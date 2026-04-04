-- The Synthesis: users + message history (migration-first)
-- message_text stores the delivered copy so generation can avoid repeating themes/scripts.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_users_telegram_chat_id on public.users (telegram_chat_id);
create index idx_users_is_active on public.users (is_active) where is_active = true;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint not null references public.users (telegram_chat_id) on delete cascade,
  category text not null check (category in ('Filter', 'Momentum', 'Perspective')),
  message_text text not null,
  content_hash text not null,
  sent_at timestamptz not null default now(),
  unique (telegram_chat_id, content_hash)
);

create index idx_messages_chat_sent on public.messages (telegram_chat_id, sent_at desc);

alter table public.users enable row level security;
alter table public.messages enable row level security;

-- No anon/authenticated policies: server uses service role only.
