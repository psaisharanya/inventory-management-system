"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

interface Transaction {
  transaction_id: string
  time: string
  type: string
  sku: string
  qty: number
  ref: string
}

export default function StockTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  async function loadTransactions() {
    setLoading(true)
    const { data, error } = await supabase
      .from("stock_transactions")
      .select(`
        transaction_id,
        quantity,
        transaction_type,
        transaction_date,
        products!inner(product_name)
      `)
      .order("transaction_date", { ascending: false })
    if (error) {
      console.error("Could not load transactions", error)
    } else {
      const formattedTransactions = (data ?? []).map((item: any) => ({
        transaction_id: item.transaction_id,
        time: item.transaction_date,
        type: item.transaction_type,
        sku: item.products.product_name,
        qty: item.transaction_type === 'IN' ? item.quantity : -item.quantity,
        ref: item.transaction_id.substring(0, 8)
      }))
      setTransactions(formattedTransactions)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Stock Transactions</h1>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Transactions</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">Time</th>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">SKU</th>
                    <th className="p-2 border">Qty</th>
                    <th className="p-2 border">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((record) => (
                    <tr key={record.transaction_id}>
                      <td className="p-2 border">{new Date(record.time).toLocaleDateString()}</td>
                      <td className={`p-2 border font-semibold ${record.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{record.type}</td>
                      <td className="p-2 border">{record.sku}</td>
                      <td className="p-2 border">{record.qty}</td>
                      <td className="p-2 border">{record.ref}</td>
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
