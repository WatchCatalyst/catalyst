-- Create price_alerts table for tracking user-defined price alerts
create table if not exists public.price_alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  asset_type text not null check (asset_type in ('crypto', 'stock')),
  alert_type text not null check (alert_type in ('above', 'below', 'change_percent')),
  target_price decimal,
  change_percent decimal,
  is_active boolean default true,
  last_triggered_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.price_alerts enable row level security;

create policy "Users can view their own alerts"
  on public.price_alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own alerts"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own alerts"
  on public.price_alerts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own alerts"
  on public.price_alerts for delete
  using (auth.uid() = user_id);

-- Add index for faster queries
create index if not exists price_alerts_user_id_idx on public.price_alerts(user_id);
create index if not exists price_alerts_active_idx on public.price_alerts(is_active) where is_active = true;
