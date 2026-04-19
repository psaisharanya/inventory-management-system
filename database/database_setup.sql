-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. SUPPLIERS
-- =========================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 2. PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(255) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,  -- What you pay suppliers
    selling_price DECIMAL(10,2) NOT NULL,  -- What you charge customers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 3. INVENTORY (1:1 with Product)
-- =========================
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE REFERENCES products(product_id) ON DELETE CASCADE,
    stock_level INT DEFAULT 0 CHECK (stock_level >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 4. PURCHASES
-- =========================
CREATE TABLE IF NOT EXISTS purchases (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 5. PURCHASE DETAILS
-- =========================
CREATE TABLE IF NOT EXISTS purchase_details (
    purchase_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES purchases(purchase_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL
);

-- =========================
-- 6. SALES
-- =========================
CREATE TABLE IF NOT EXISTS sales (
    sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 7. SALES DETAILS
-- =========================
CREATE TABLE IF NOT EXISTS sales_details (
    sales_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(sale_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
    quantity_sold INT NOT NULL CHECK (quantity_sold > 0),
    price DECIMAL(10,2) NOT NULL
);

-- =========================
-- 8. STOCK TRANSACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
    reference_id UUID, -- purchase_id or sale_id
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INDEXES (for performance)
-- =========================
CREATE INDEX IF NOT EXISTS idx_product_inventory ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_details_purchase ON purchase_details(purchase_id);
CREATE INDEX IF NOT EXISTS idx_sales_details_sale ON sales_details(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_transactions(product_id);

-- Enable Row Level Security (optional, but recommended)
-- For development, we'll disable RLS to allow all anonymous access
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions DISABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for development)
-- Suppliers
CREATE POLICY "Allow SELECT on suppliers" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on suppliers" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on suppliers" ON suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on suppliers" ON suppliers FOR DELETE USING (true);

-- Products
CREATE POLICY "Allow SELECT on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on products" ON products FOR DELETE USING (true);

-- Inventory
CREATE POLICY "Allow SELECT on inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on inventory" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on inventory" ON inventory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on inventory" ON inventory FOR DELETE USING (true);

-- Purchases
CREATE POLICY "Allow SELECT on purchases" ON purchases FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on purchases" ON purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on purchases" ON purchases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on purchases" ON purchases FOR DELETE USING (true);

-- Purchase Details
CREATE POLICY "Allow SELECT on purchase_details" ON purchase_details FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on purchase_details" ON purchase_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on purchase_details" ON purchase_details FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on purchase_details" ON purchase_details FOR DELETE USING (true);

-- Sales
CREATE POLICY "Allow SELECT on sales" ON sales FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on sales" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on sales" ON sales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on sales" ON sales FOR DELETE USING (true);

-- Sales Details
CREATE POLICY "Allow SELECT on sales_details" ON sales_details FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on sales_details" ON sales_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on sales_details" ON sales_details FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on sales_details" ON sales_details FOR DELETE USING (true);

-- Stock Transactions
CREATE POLICY "Allow SELECT on stock_transactions" ON stock_transactions FOR SELECT USING (true);
CREATE POLICY "Allow INSERT on stock_transactions" ON stock_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE on stock_transactions" ON stock_transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE on stock_transactions" ON stock_transactions FOR DELETE USING (true);