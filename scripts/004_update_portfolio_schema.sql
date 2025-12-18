-- Update portfolio table to include additional tracking fields
alter table public.portfolio 
  add column if not exists quantity decimal,
  add column if not exists avg_price decimal,
  add column if not exists notes text;

-- Add index for faster portfolio queries
create index if not exists portfolio_user_id_idx on public.portfolio(user_id);
