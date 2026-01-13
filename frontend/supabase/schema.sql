-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Products Table
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz default now()
);

-- Customers Table
create table customers (
  id uuid default uuid_generate_v4() primary key,
  name text,
  phone text,
  vehicle_number text,
  vehicle_name text,
  gst_number text,
  created_at timestamptz default now()
);

-- Sequence for Invoice Numbers (starting from 100 or as desired)
create sequence if not exists invoice_number_seq start 100;

-- Bills Table
create table bills (
  id uuid default uuid_generate_v4() primary key,
  invoice_no bigint default nextval('invoice_number_seq'),
  customer_id uuid references customers(id),
  bill_date timestamptz default now(),
  total_amount numeric(10, 2) default 0,
  created_at timestamptz default now()
);

-- Bill Items Table
create table bill_items (
  id uuid default uuid_generate_v4() primary key,
  bill_id uuid references bills(id) on delete cascade,
  product_id uuid references products(id),
  description text not null,
  quantity integer not null default 1,
  price numeric(10, 2) not null,
  amount numeric(10, 2) generated always as (quantity * price) stored,
  created_at timestamptz default now()
);

-- RLS Policies (Simple public access for this internal tool as requested, or authenticated)
-- Attempting to secure it behind auth at least.

alter table products enable row level security;
alter table customers enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;

-- Policy: Allow read/write for authenticated users (assuming staff login)
create policy "Enable all for authenticated users" on products for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on customers for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on bills for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on bill_items for all using (auth.role() = 'authenticated');
