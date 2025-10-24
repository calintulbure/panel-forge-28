-- Chat rooms table
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Chat messages table
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Read receipts table (per user, per room)
create table if not exists public.chat_reads (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch',
  primary key (room_id, user_id)
);

-- Enable RLS
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reads enable row level security;

-- RLS policies for chat_rooms
create policy "Anyone can view chat rooms"
  on public.chat_rooms
  for select
  using (true);

-- RLS policies for chat_messages
create policy "Anyone can view messages"
  on public.chat_messages
  for select
  using (true);

create policy "Authenticated users can insert their own messages"
  on public.chat_messages
  for insert
  with check (auth.uid() = user_id);

-- RLS policies for chat_reads
create policy "Users can view their own read status"
  on public.chat_reads
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own read status"
  on public.chat_reads
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own read status"
  on public.chat_reads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed default room
insert into public.chat_rooms (name, is_default)
select 'General', true
where not exists (select 1 from public.chat_rooms where is_default = true);

-- Enable realtime for chat_messages
alter publication supabase_realtime add table public.chat_messages;