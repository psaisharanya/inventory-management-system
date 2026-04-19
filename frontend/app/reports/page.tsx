"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function ReportsPage() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const today = new Date()
  const [fromDate, setFromDate] = useState(sixMonthsAgo.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10))
  const [sales, setSales] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [topSuppliers, setTopSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadReports = async () => {
    setLoading(true)

    const fromDateTime = `${fromDate}T00:00:00Z`
    const toDateTime = `${toDate}T23:59:59Z`

    const [salesRes, inventoryTxRes, purchasesRes] = await Promise.all([
      supabase
        .from("sales")
        .select(`
          sale_id,
          sale_date,
          sales_details(quantity_sold, price, product_id, products(product_name, cost_price))
        `)
        .gte("sale_date", fromDateTime)
        .lte("sale_date", toDateTime),
      supabase
        .from("stock_transactions")
        .select(`
          product_id,
          quantity,
          transaction_type,
          transaction_date,
          products(product_name, cost_price, selling_price)
        `)
        .gte("transaction_date", fromDateTime)
        .lte("transaction_date", toDateTime),
      supabase
        .from("purchases")
        .select(`
          purchase_id,
          purchase_date,
          supplier_id,
          suppliers(supplier_name),
          purchase_details(quantity, price)
        `)
        .gte("purchase_date", fromDateTime)
        .lte("purchase_date", toDateTime)
    ])

    const flattenedSales = (salesRes.data ?? []).flatMap((sale: any) =>
      (sale.sales_details ?? []).map((detail: any) => ({
        ...detail,
        sale_date: sale.sale_date,
        selling_price: detail.price,
        products: detail.products,
      }))
    )

    console.log("Flattened sales for reports:", flattenedSales)

    setSales(flattenedSales)

    const inventoryMap = new Map<string, any>()
    ;(inventoryTxRes.data ?? []).forEach((tx: any) => {
      const current = inventoryMap.get(tx.product_id) || {
        product_id: tx.product_id,
        products: tx.products,
        stock_level: 0,
      }
      const delta = tx.transaction_type === "IN" ? Number(tx.quantity) : -Number(tx.quantity)
      current.stock_level += delta
      inventoryMap.set(tx.product_id, current)
    })

    setInventory(Array.from(inventoryMap.values()))

    const supplierStats = (purchasesRes.data ?? []).reduce((acc: any, item: any) => {
      const supplier = item.suppliers?.supplier_name || "Unknown"
      const value = (item.purchase_details ?? []).reduce((subSum: number, detail: any) => subSum + (detail.quantity || 0) * (detail.price || 0), 0)
      acc[supplier] = (acc[supplier] || 0) + value
      return acc
    }, {})

    setTopSuppliers(
      Object.entries(supplierStats)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, total]: any) => ({ supplier: name, revenue: total }))
    )

    setLoading(false)
  }

  useEffect(() => {
    loadReports()
  }, [fromDate, toDate])

  const totalUnitsSold = useMemo(
    () => sales.reduce((sum, record) => sum + (record.quantity_sold || 0), 0),
    [sales]
  )

  const totalRevenue = useMemo(
    () => sales.reduce((sum, record) => sum + (record.selling_price || 0) * (record.quantity_sold || 0), 0),
    [sales]
  )

  const totalCostOfGoodsSold = useMemo(
    () =>
      sales.reduce((sum, record) => {
        const cost = record.products?.cost_price ?? 0
        return sum + cost * (record.quantity_sold || 0)
      }, 0),
    [sales]
  )

  const totalProfit = useMemo(() => totalRevenue - totalCostOfGoodsSold, [totalRevenue, totalCostOfGoodsSold])

  const profitMargin = useMemo(
    () => (totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0),
    [totalRevenue, totalProfit]
  )

  const avgProfitPerItem = useMemo(
    () => (totalUnitsSold > 0 ? totalProfit / totalUnitsSold : 0),
    [totalProfit, totalUnitsSold]
  )

  const lowStockItems = useMemo(() => inventory.filter((item) => item.stock_level <= 10), [inventory])

  const inventoryValue = useMemo(
    () =>
      inventory.reduce((sum, item) => {
        const cost = item.products?.cost_price ?? 0
        return sum + cost * (item.stock_level || 0)
      }, 0),
    [inventory]
  )

  const topProductsByProfit = useMemo(() => {
    const stat: Record<string, number> = {}
    sales.forEach((record) => {
      const name = record.products?.product_name || "Unknown"
      const cost = record.products?.cost_price ?? 0
      const revenue = (record.selling_price || 0) * (record.quantity_sold || 0)
      const profit = revenue - cost * (record.quantity_sold || 0)
      stat[name] = (stat[name] || 0) + profit
    })
    return Object.entries(stat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([product, profit]) => ({ product, profit }))
  }, [sales])

  const recommendations = useMemo(() => {
    const recs = []
    if (lowStockItems.length > 0) {
      recs.push(`🚨 Restock ${lowStockItems.length} low-stock items to avoid shortages.`)
    }
    if (topProductsByProfit.length > 0) {
      recs.push(`💡 Focus on promoting ${topProductsByProfit[0].product} - it's your top profit maker!`)
    }
    if (profitMargin < 20) {
      recs.push(`📈 Boost margins by reviewing pricing or reducing costs.`)
    }
    if (totalRevenue > 0 && totalUnitsSold < 50) {
      recs.push(`🎯 Increase sales volume to maximize profits.`)
    }
    return recs
  }, [lowStockItems, topProductsByProfit, profitMargin, totalRevenue, totalUnitsSold])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-center text-indigo-800 mb-8">📊 Smart Reports</h1>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex gap-2 items-center">
            <label className="font-medium text-gray-700">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="font-medium text-gray-700">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center col-span-2">
            <button
              onClick={loadReports}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              🔄 Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading insights...</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-2">💰</div>
                <h2 className="font-semibold text-lg text-gray-800">Revenue</h2>
                <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total sales income</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-2">📈</div>
                <h2 className="font-semibold text-lg text-gray-800">Profit</h2>
                <p className="text-3xl font-bold text-blue-600">₹{totalProfit.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Revenue minus costs</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-2">📊</div>
                <h2 className="font-semibold text-lg text-gray-800">Margin</h2>
                <p className="text-3xl font-bold text-purple-600">{profitMargin.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Profit percentage</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-2">📦</div>
                <h2 className="font-semibold text-lg text-gray-800">Low Stock</h2>
                <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
                <p className="text-sm text-gray-500">Items ≤ 10 units</p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="font-semibold text-xl text-gray-800 mb-4">🏆 Top Performers</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-gray-700">Best Product by Profit</h3>
                    {topProductsByProfit.length > 0 ? (
                      <p className="text-lg font-bold text-green-600">{topProductsByProfit[0].product}: ₹{topProductsByProfit[0].profit.toFixed(0)}</p>
                    ) : (
                      <p className="text-gray-500">No data</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700">Top Supplier</h3>
                    {topSuppliers.length > 0 ? (
                      <p className="text-lg font-bold text-blue-600">{topSuppliers[0].supplier}: ₹{Number(topSuppliers[0].revenue).toLocaleString()}</p>
                    ) : (
                      <p className="text-gray-500">No data</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="font-semibold text-xl text-gray-800 mb-4">🤖 AI Insights</h2>
                <div className="space-y-2">
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, idx) => (
                      <p key={idx} className="text-gray-700 bg-gray-50 p-3 rounded-lg">{rec}</p>
                    ))
                  ) : (
                    <p className="text-gray-500">Everything looks good! Keep up the great work.</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

