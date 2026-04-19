"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Link from "next/link"

interface Transaction {
  transaction_id: string
  transaction_type: 'IN' | 'OUT'
  quantity: number
  transaction_date: string
  product_name: string
  reference_type?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  async function loadTransactions() {
    setLoading(true)
    try {
      let query = supabase
        .from("stock_transactions")
        .select(`
          transaction_id,
          transaction_type,
          quantity,
          transaction_date,
          products!inner(product_name)
        `)
        .order("transaction_date", { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error("Error loading transactions:", error)
        return
      }

      const formattedTransactions = (data ?? []).map((tx: any) => ({
        transaction_id: tx.transaction_id,
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        transaction_date: tx.transaction_date,
        product_name: tx.products.product_name
      }))

      setTransactions(formattedTransactions)
    } catch (err) {
      console.error("Unexpected error loading transactions:", err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  // Filter transactions based on type and search term
  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filter === 'ALL' || tx.transaction_type === filter
    const matchesSearch = tx.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">All Transactions</h1>
          <Link
            href="/dashboard"
            className="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded ${filter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('IN')}
                className={`px-4 py-2 rounded ${filter === 'IN' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                Purchases (IN)
              </button>
              <button
                onClick={() => setFilter('OUT')}
                className={`px-4 py-2 rounded ${filter === 'OUT' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                Sales (OUT)
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Total Transactions</p>
            <p className="text-2xl font-bold">{filteredTransactions.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Purchases (IN)</p>
            <p className="text-2xl font-bold text-emerald-600">
              {filteredTransactions.filter(tx => tx.transaction_type === 'IN').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Sales (OUT)</p>
            <p className="text-2xl font-bold text-rose-600">
              {filteredTransactions.filter(tx => tx.transaction_type === 'OUT').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Total Items Moved</p>
            <p className="text-2xl font-bold">
              {filteredTransactions.reduce((sum, tx) => sum + tx.quantity, 0)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading transactions...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Product</th>
                      <th className="p-4 text-left">Quantity</th>
                      <th className="p-4 text-left">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((transaction) => (
                      <tr key={transaction.transaction_id} className="border-t border-slate-200">
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.transaction_type === 'IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {transaction.transaction_type === 'IN' ? 'Purchase' : 'Sale'}
                          </span>
                        </td>
                        <td className="p-4 font-medium">{transaction.product_name}</td>
                        <td className="p-4">
                          <span className={transaction.transaction_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>
                            {transaction.transaction_type === 'IN' ? '+' : '-'}{transaction.quantity}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {new Date(transaction.transaction_date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                  <div className="text-sm text-slate-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm border rounded ${
                            pageNum === currentPage
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}