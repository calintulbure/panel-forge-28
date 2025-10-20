-- Create app_role enum for user roles
create type public.app_role as enum ('admin', 'operator');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS policy: Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS policy: Only admins can manage roles
create policy "Admins can insert roles"
  on public.user_roles
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update roles"
  on public.user_roles
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Create products table
create table public.products (
  article_id integer primary key,
  erp_product_code varchar(100),
  erp_product_description text,
  categ1 varchar(150),
  categ2 varchar(150),
  categ3 varchar(150),
  stare_oferta varchar(50),
  stare_stoc varchar(50),
  
  -- Publishing fields for yli.ro
  site_ro_url text,
  site_ro_snapshot_url text,
  yliro_sku text,
  yliro_descriere text,
  
  -- Publishing fields for yli.hu
  site_hu_url text,
  site_hu_snapshot_url text,
  ylihu_sku text,
  ylihu_descriere text,
  
  validated boolean default false,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on products
alter table public.products enable row level security;

-- RLS policies for products: Authenticated users can read
create policy "Authenticated users can view products"
  on public.products
  for select
  to authenticated
  using (true);

-- RLS policies for products: Admins and operators can manage
create policy "Admins and operators can insert products"
  on public.products
  for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'operator')
  );

create policy "Admins and operators can update products"
  on public.products
  for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'operator')
  );

create policy "Admins can delete products"
  on public.products
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add trigger for products updated_at
create trigger products_updated_at
  before update on public.products
  for each row
  execute function public.handle_updated_at();