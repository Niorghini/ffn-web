-- 发法牛 v1.2 初始迁移
-- 完全照搬 PRD 3.3：notes / tags / note_tags 三张表 + RLS + realtime + 索引

-- ─── notes ───────────────────────────────────────────────────────────────
create table notes (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  content text not null,
  status text check (status in ('pending', 'completed')) not null default 'pending',
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null,
  deleted_at timestamp with time zone,
  version integer not null default 1,
  last_sync_device text not null
);

alter table notes enable row level security;
create policy "Users can access their own notes" on notes
  for all using (auth.uid() = user_id);

alter publication supabase_realtime add table notes;

create index notes_user_id_updated_at_idx on notes(user_id, updated_at);
create index notes_user_id_status_idx on notes(user_id, status);
create index notes_user_id_deleted_at_idx on notes(user_id, deleted_at);

-- ─── tags ────────────────────────────────────────────────────────────────
create table tags (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  color text not null,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null,
  deleted_at timestamp with time zone,
  version integer not null default 1,
  last_sync_device text not null,
  unique(user_id, name)
);

alter table tags enable row level security;
create policy "Users can access their own tags" on tags
  for all using (auth.uid() = user_id);

alter publication supabase_realtime add table tags;

create index tags_user_id_updated_at_idx on tags(user_id, updated_at);

-- ─── note_tags ───────────────────────────────────────────────────────────
create table note_tags (
  note_id uuid references notes(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone not null,
  deleted_at timestamp with time zone,
  version integer not null default 1,
  last_sync_device text not null,
  primary key (note_id, tag_id)
);

alter table note_tags enable row level security;
create policy "Users can access their own note_tags" on note_tags
  for all using (auth.uid() = user_id);

alter publication supabase_realtime add table note_tags;

create index note_tags_user_id_updated_at_idx on note_tags(user_id, created_at);
