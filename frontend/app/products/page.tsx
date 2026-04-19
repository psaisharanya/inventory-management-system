"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

interface Product {
  product_id: string
  product_name: string
  cost_price: number
  selling_price: number
  stock_level: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCostPrice, setEditCostPrice] = useState(0)
  const [editSellingPrice, setEditSellingPrice] = useState(0)

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: "Out of Stock", color: "text-red-600 bg-red-50" }
    if (stock <= 5) return { text: "Low Stock", color: "text-yellow-600 bg-yellow-50" }
    return { text: "In Stock", color: "text-green-600 bg-green-50" }
  }

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock_level > 0 && product.stock_level <= 5).length,
    [products]
  )

  const totalValue = useMemo(
    () => products.reduce((sum, product) => sum + product.selling_price * product.stock_level, 0),
    [products]
  )

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from("products")
      .select(`
        product_id,
        product_name,
        cost_price,
        selling_price,
        inventory!left(stock_level)
      `)
    if (error) {
      console.error("Could not fetch products", error)
    } else {
      const productsWithStock = (data ?? []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        stock_level: item.inventory?.stock_level || 0
      }))
      setProducts(productsWithStock)
    }
    setLoading(false)
  }

  async function handleAddProduct(event: React.FormEvent) {
    event.preventDefault()
    const costPriceValue = Number(costPrice)
    const sellingPriceValue = Number(sellingPrice)

    if (!name.trim() || isNaN(costPriceValue) || costPriceValue < 0 || isNaN(sellingPriceValue) || sellingPriceValue < 0) {
      alert("Please provide name, non-negative cost price, and selling price")
      return
    }

    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        product_name: name,
        cost_price: costPriceValue,
        selling_price: sellingPriceValue,
        price: sellingPriceValue,
      })
      .select("product_id")
      .single()
    if (productError) {
      console.error("Could not add product", productError)
      alert("Error adding product: " + productError.message)
      return
    }
    setName("")
    setCostPrice("")
    setSellingPrice("")
    await loadProducts()
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Are you sure you want to delete this product?")) return
    
    const { error } = await supabase.from("products").delete().eq("product_id", productId)
    if (error) {
      console.error("Could not delete product", error)
      alert("Error deleting product: " + JSON.stringify(error))
      return
    }
    alert("Product deleted successfully!")
    await loadProducts()
  }

  async function handleEditProduct(product: Product) {
    setEditingId(product.product_id)
    setEditName(product.product_name)
    setEditCostPrice(product.cost_price)
    setEditSellingPrice(product.selling_price)
  }

  async function handleUpdateProduct(productId: string) {
    if (!editName.trim()) {
      alert("Please enter a product name")
      return
    }

    if (editCostPrice < 0 || editSellingPrice < 0) {
      alert("Prices cannot be negative")
      return
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({
          product_name: editName,
          cost_price: editCostPrice,
          selling_price: editSellingPrice,
          price: editSellingPrice,
        })
        .eq("product_id", productId)

      if (error) {
        alert("Error updating product: " + JSON.stringify(error))
        return
      }

      alert("Product updated successfully!")
      setEditingId(null)
      await loadProducts()
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function recalculateInventory() {
    if (!confirm("This will recalculate stock levels based on all transactions. Continue?")) return

    try {
      // Get all products
      const { data: productsData, error: prodError } = await supabase.from("products").select("product_id")
      if (prodError) throw prodError

      for (const product of productsData || []) {
        // Sum transactions for this product
        const { data: transactions, error: transError } = await supabase
          .from("stock_transactions")
          .select("quantity, transaction_type")
          .eq("product_id", product.product_id)

        if (transError) throw transError

        let totalStock = 0
        for (const trans of transactions || []) {
          if (trans.transaction_type === 'IN') totalStock += trans.quantity
          else if (trans.transaction_type === 'OUT') totalStock -= trans.quantity
        }

        // Update inventory
        const { error: invError } = await supabase
          .from("inventory")
          .upsert({ product_id: product.product_id, stock_level: Math.max(0, totalStock) })

        if (invError) throw invError
      }

      alert("Inventory recalculated successfully!")
      await loadProducts()
    } catch (err) {
      alert("Error recalculating inventory: " + err)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Products</h1>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">Total Stock Value</p>
            <p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">Total Products</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">Low Stock</p>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </div>
        </section>

        <section className="flex justify-center">
          <button
            onClick={recalculateInventory}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            🔄 Recalculate Inventory
          </button>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Add Product</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              className="rounded border border-slate-300 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
            />
            <input
              className="rounded border border-slate-300 p-2"
              type="number"
              value={costPrice}
              min={0}
              step="0.01"
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="Cost Price (e.g. 50.00)"
            />
            <input
              className="rounded border border-slate-300 p-2"
              type="number"
              value={sellingPrice}
              min={0}
              step="0.01"
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="Selling Price (e.g. 75.00)"
            />
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Add Product
            </button>
          </form>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Product List</h2>
            <button
              onClick={loadProducts}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Stock</th>
                    <th className="p-2 border">Cost Price</th>
                    <th className="p-2 border">Selling Price</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product.stock_level)
                    return (
                      <tr key={product.product_id}>
                      <td className="p-2 border">
                        {editingId === product.product_id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border rounded px-1"
                          />
                        ) : (
                          product.product_name
                        )}
                      </td>
                      <td className="p-2 border">{product.stock_level}</td>
                      <td className="p-2 border">
                        {editingId === product.product_id ? (
                          <input
                            type="number"
                            value={editCostPrice}
                            onChange={(e) => setEditCostPrice(Number(e.target.value))}
                            className="w-20 border rounded px-1"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `₹${product.cost_price}`
                        )}
                      </td>
                      <td className="p-2 border">
                        {editingId === product.product_id ? (
                          <input
                            type="number"
                            value={editSellingPrice}
                            onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                            className="w-20 border rounded px-1"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `₹${product.selling_price}`
                        )}
                      </td>
                      <td className="p-2 border">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="p-2 border space-x-1">
                        {editingId === product.product_id ? (
                          <>
                            <button
                              onClick={() => handleUpdateProduct(product.product_id)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded bg-rose-500 px-2 py-1 text-white hover:bg-rose-600 text-xs"
                              onClick={() => handleDeleteProduct(product.product_id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
