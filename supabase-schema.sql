-- Run this in Supabase Dashboard > SQL Editor

create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text,
  created_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;

-- Row Level Security (open for now)
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Allow all conversations" on conversations for all using (true) with check (true);
create policy "Allow all messages" on messages for all using (true) with check (true);
