"use client"

import {
Chart as ChartJS,
CategoryScale,
LinearScale,
BarElement,
ArcElement,
Tooltip,
Legend
} from "chart.js"

import Link from "next/link"
import { Bar, Doughnut } from "react-chartjs-2"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "../../components/Sidebar"

ChartJS.register(
CategoryScale,
LinearScale,
BarElement,
ArcElement,
Tooltip,
Legend
)

export default function Dashboard(){
  const router = useRouter()
  const [productsCount, setProductsCount] = useState(0)
  const [suppliersCount, setSuppliersCount] = useState(0)
  const [purchasesCount, setPurchasesCount] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [stockSummary, setStockSummary] = useState({ inStock: 0, lowStock: 0, outOfStock: 0 })
  const [purchaseChartData, setPurchaseChartData] = useState({ purchases: [0, 0, 0, 0], sales: [0, 0, 0, 0] })
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  const handleLogout = () => {
    localStorage.removeItem("inventory-auth")
    router.push("/login")
  }

  useEffect(() => {
    async function loadStats() {
      const [p, s, pu, sa, purchases, sales, transactionsRes] = await Promise.all([
        supabase.from("products").select("product_id", { count: "exact" }),
        supabase.from("suppliers").select("supplier_id", { count: "exact" }),
        supabase.from("purchases").select("purchase_id", { count: "exact" }),
        supabase.from("sales").select("sale_id", { count: "exact" }),
        supabase.from("purchase_details").select("quantity, price, purchases!inner(purchase_date)").order("purchases.purchase_date", { ascending: false }).limit(100),
        supabase.from("sales_details").select("quantity_sold, price, sales!inner(sale_date)").order("sales.sale_date", { ascending: false }).limit(100),
        supabase.from("stock_transactions").select("product_id, quantity, transaction_type, products!inner(product_name)")
      ])

      if (p.error || s.error || pu.error || sa.error || purchases.error || sales.error || transactionsRes.error) {
        console.error("Dashboard stats load error", {
          p,
          s,
          pu,
          sa,
          purchases,
          sales,
          transactionsRes,
        })
      }

      setProductsCount(p.count ?? 0)
      setSuppliersCount(s.count ?? 0)
      setPurchasesCount(pu.count ?? 0)
      setSalesCount(sa.count ?? 0)

      const stockMap = new Map<string, number>()
      ;(transactionsRes.data ?? []).forEach((tx: any) => {
        const value = stockMap.get(tx.product_id) ?? 0
        const delta = tx.transaction_type === 'IN' ? Number(tx.quantity) : -Number(tx.quantity)
        stockMap.set(tx.product_id, value + delta)
      })

      const inStock = Array.from(stockMap.values()).filter((stock) => stock > 5).length
      const lowStock = Array.from(stockMap.values()).filter((stock) => stock > 0 && stock <= 5).length
      const outOfStock = Array.from(stockMap.values()).filter((stock) => stock <= 0).length
      setStockSummary({ inStock, lowStock, outOfStock })
      setLowStockCount(lowStock)

      // Aggregate purchases and sales by week
      const now = new Date()
      const weeks = [0, 1, 2, 3].map(i => {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - (i * 7))
        return weekStart.toISOString().substring(0, 10)
      }).reverse()

      const purchaseRows = purchases.data ?? []
      const salesRows = sales.data ?? []

      const weeklyPurchases = weeks.map(week => {
        return purchaseRows.filter((row: any) => row.purchases.purchase_date >= week).reduce((sum: number, row: any) => sum + row.quantity * row.price, 0)
      })

      const weeklySales = weeks.map(week => {
        return salesRows.filter((row: any) => row.sales.sale_date >= week).reduce((sum: number, row: any) => sum + row.quantity_sold * row.price, 0)
      })

      setPurchaseChartData({ purchases: weeklyPurchases, sales: weeklySales })

      const allProductsWithStock = (transactionsRes.data ?? []).map((tx: any) => ({
        product_id: tx.product_id,
        product_name: tx.products.product_name,
        stock: stockMap.get(tx.product_id) ?? 0,
      }))
      
      const lowStockProductsList = allProductsWithStock.filter((item: any) => item.stock > 0 && item.stock <= 5)

      setLowStockProducts(lowStockProductsList)

      // Recent transactions from stock_transactions
      const { data: transactions } = await supabase
        .from("stock_transactions")
        .select(`
          transaction_type,
          quantity,
          transaction_date,
          products!inner(product_name)
        `)
        .order("transaction_date", { ascending: false })
        .limit(3)
      const recent = (transactions ?? []).map((t: any) => ({
        type: t.transaction_type,
        description: `${t.transaction_type === 'IN' ? 'Purchase' : 'Sale'} of ${t.quantity} ${t.products.product_name}`,
        time: new Date(t.transaction_date).toLocaleString()
      }))
      setRecentTransactions(recent)
    }

    loadStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000)

    if (localStorage.getItem("inventory-auth") !== "true") {
      router.push("/login")
    }

    return () => clearInterval(interval)
  }, [router])

  const hasPurchaseData = purchaseChartData.purchases.some((value) => value > 0) || purchaseChartData.sales.some((value) => value > 0)
  const purchaseData = {
    labels:["Week 1","Week 2","Week 3","Week 4"],
    datasets:[
      {
        label:"Purchases",
        data: purchaseChartData.purchases,
        backgroundColor: hasPurchaseData ? "rgba(34,197,94,0.65)" : "rgba(148,163,184,0.3)",
        borderColor: hasPurchaseData ? "rgba(34,197,94,0.95)" : "rgba(100,116,139,0.9)",
        borderWidth:2,
        tension:0.4
      },
      {
        label:"Sales",
        data: purchaseChartData.sales,
        backgroundColor: hasPurchaseData ? "rgba(239,68,68,0.65)" : "rgba(148,163,184,0.3)",
        borderColor: hasPurchaseData ? "rgba(239,68,68,0.95)" : "rgba(100,116,139,0.9)",
        borderWidth:2,
        tension:0.4
      }
    ]
  }

  const resolvedLowStockValues = [stockSummary.inStock, stockSummary.lowStock, stockSummary.outOfStock]
  const hasInventoryData = resolvedLowStockValues.some((v) => v > 0)
  
  const lowStockItemsText = lowStockProducts.length > 0 
    ? lowStockProducts.map(p => `${p.product_name} (${p.stock})`).join(", ")
    : "None"

  const inventoryData = {
    labels: hasInventoryData ? [
      `In Stock (${stockSummary.inStock})`,
      `Low Stock (${stockSummary.lowStock}): ${lowStockItemsText}`,
      `Out of Stock (${stockSummary.outOfStock})`
    ] : ["In Stock", "Low Stock", "Out of Stock"],
    datasets:[
      {
        data: hasInventoryData ? resolvedLowStockValues : [1, 1, 1],
        backgroundColor: hasInventoryData ? ["#10b981", "#f59e0b", "#ef4444"] : ["#cbd5e1", "#cbd5e1", "#cbd5e1"]
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `₹${value}`,
        },
        beginAtZero: true,
      },
    },
  }

  useEffect(() => {
    if (localStorage.getItem("inventory-auth") !== "true") {
      router.push("/login")
    }
  }, [router])

  return(
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8">

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-slate-900">Welcome back, Admin!</h2>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <article className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <small className="text-slate-500">Total Products</small>
            <div className="text-3xl font-bold">{productsCount}</div>
            <p className="text-xs text-emerald-600">Active items</p>
          </article>

          <article className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <small className="text-slate-500">Total Suppliers</small>
            <div className="text-3xl font-bold">{suppliersCount}</div>
            <p className="text-xs text-slate-500">Registered</p>
          </article>

          <article className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <small className="text-slate-500">Total Purchases</small>
            <div className="text-3xl font-bold">{purchasesCount}</div>
            <p className="text-xs text-emerald-600">This month</p>
          </article>

          <article className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <small className="text-slate-500">Low Stock Alerts</small>
            <div className="text-3xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-rose-600">Needs attention</p>
          </article>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          <section className="xl:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Revenue Overview</h3>
              <select className="rounded-md border border-slate-300 p-1 text-sm">
                <option>This Month</option>
                <option>Last 6 Months</option>
                <option>Year</option>
              </select>
            </div>
            <div className="h-56 sm:h-64">
              <Bar data={purchaseData} options={chartOptions} />
            </div>
          </section>

          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Stock Status</h3>
            <div className="h-56 sm:h-64 flex items-center justify-center">
              {hasInventoryData ? (
                <Doughnut data={inventoryData} options={chartOptions} />
              ) : (
                <p className="text-sm text-gray-500">No inventory data yet. Add products or purchases to see stock status.</p>
              )}
            </div>
            <ul className="mt-4 space-y-2">
              <li className="flex justify-between text-sm"><span>In Stock</span><span>{stockSummary.inStock}</span></li>
              <li className="flex justify-between text-sm"><span>Low Stock</span><span className="text-amber-600">{stockSummary.lowStock}</span></li>
              <li className="flex justify-between text-sm"><span>Out of Stock</span><span className="text-rose-600">{stockSummary.outOfStock}</span></li>
            </ul>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <Link href="/transactions" className="text-indigo-600 text-sm hover:text-indigo-800">
                View All
              </Link>
            </div>
            <ul className="space-y-3 text-sm">
              {recentTransactions.map((transaction, index) => (
                <li key={index} className={`rounded-lg border border-slate-200 p-3 ${transaction.type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <strong>{transaction.type}</strong> {transaction.description} • {transaction.time}
                </li>
              ))}
            </ul>
          </section>

        </div>
      </main>
    </div>
  )
} 
