const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// In-memory data store (fallback)
let suppliers = [];
let products = [];
let purchases = [];
let purchaseDetails = [];
let sales = [];
let salesDetails = [];
let inventory = [];
let stockTransactions = [];

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

// API Routes

// Suppliers
app.get('/api/suppliers', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(suppliers);
});

app.post('/api/suppliers', async (req, res) => {
  const supplier = { id: generateId(), ...req.body };
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  suppliers.push(supplier);
  res.json(supplier);
});

app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').update(req.body).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  const index = suppliers.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'Supplier not found' });
  suppliers[index] = { ...suppliers[index], ...req.body };
  res.json(suppliers[index]);
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: 'Supplier deleted' });
  }
  suppliers = suppliers.filter(s => s.id !== id);
  res.json({ message: 'Supplier deleted' });
});

// Products
app.get('/api/products', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const product = { id: generateId(), ...req.body };
  if (supabase) {
    const { data, error } = await supabase.from('products').insert(product).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  products.push(product);
  res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from('products').update(req.body).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  products[index] = { ...products[index], ...req.body };
  res.json(products[index]);
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: 'Product deleted' });
  }
  products = products.filter(p => p.id !== id);
  res.json({ message: 'Product deleted' });
});

// Purchases
app.get('/api/purchases', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('purchases').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(purchases);
});

app.post('/api/purchases', async (req, res) => {
  const purchase = { id: generateId(), ...req.body };
  if (supabase) {
    const { data, error } = await supabase.from('purchases').insert(purchase).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  purchases.push(purchase);
  res.json(purchase);
});

// Sales
app.get('/api/sales', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('sales').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(sales);
});

app.post('/api/sales', async (req, res) => {
  const sale = { id: generateId(), ...req.body };
  if (supabase) {
    const { data, error } = await supabase.from('sales').insert(sale).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  sales.push(sale);
  res.json(sale);
});

// Inventory
app.get('/api/inventory', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(inventory);
});

// Stock Transactions
app.get('/api/stock-transactions', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from('stock_transactions').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(stockTransactions);
});

app.post('/api/stock-transactions', async (req, res) => {
  const transaction = { id: generateId(), ...req.body };
  if (supabase) {
    const { data, error } = await supabase.from('stock_transactions').insert(transaction).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data[0]);
  }
  stockTransactions.push(transaction);
  res.json(transaction);
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});