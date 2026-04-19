"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

interface Product {
  product_id: string
  product_name: string
  stock_level: number
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  async function loadProducts() {
    setLoading(true)

    // Source of truth: stock_transactions sums.
    const [productsRes, transRes] = await Promise.all([
      supabase.from("products").select("product_id, product_name"),
      supabase
        .from("stock_transactions")
        .select("product_id, quantity, transaction_type")
    ])

    if (productsRes.error || transRes.error) {
      console.error("Could not fetch inventory reports", productsRes.error ?? transRes.error)
      setLoading(false)
      return
    }

    const stockMap = new Map<string, number>()
    ;(transRes.data ?? []).forEach((tx: any) => {
      const current = stockMap.get(tx.product_id) || 0
      const delta = tx.transaction_type === "IN" ? Number(tx.quantity) : -Number(tx.quantity)
      stockMap.set(tx.product_id, current + delta)
    })

    const inventoryWithNames = (productsRes.data ?? []).map((product: any) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      stock_level: stockMap.get(product.product_id) ?? 0
    }))

    setProducts(inventoryWithNames)
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Inventory</h1>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Current Inventory Levels</h2>
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
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.product_id}>
                      <td className="p-2 border">{product.product_name}</td>
                      <td className="p-2 border">{product.stock_level}</td>
                      <td className="p-2 border">{product.stock_level <= 10 ? "Low" : "In Stock"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
