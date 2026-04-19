"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function TestDBPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    console.log(msg)
    setLogs((prev) => [...prev, msg])
  }

  const testConnection = async () => {
    setLogs([])
    addLog("Testing Supabase connection...")

    try {
      const { data, error } = await supabase.from("suppliers").select("count").limit(1)
      if (error) {
        addLog(`❌ Connection failed: ${JSON.stringify(error)}`)
      } else {
        addLog("✅ Connection successful")
      }
    } catch (err) {
      addLog(`❌ Error: ${err}`)
    }
  }

  const testInsertSupplier = async () => {
    setLogs([])
    addLog("Testing supplier insert...")

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ supplier_name: "Test Supplier", contact: "test@example.com" })
        .select()

      if (error) {
        addLog(`❌ Insert failed: ${JSON.stringify(error)}`)
      } else {
        addLog(`✅ Supplier inserted: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      addLog(`❌ Error: ${err}`)
    }
  }

  const testInsertProduct = async () => {
    setLogs([])
    addLog("Testing product insert...")

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({ product_name: "Test Product", price: 99.99 })
        .select()

      if (error) {
        addLog(`❌ Insert failed: ${JSON.stringify(error)}`)
      } else {
        addLog(`✅ Product inserted: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      addLog(`❌ Error: ${err}`)
    }
  }

  const testInsertPurchase = async () => {
    setLogs([])
    addLog("Testing purchase insert workflow...")

    try {
      // Get a supplier
      const { data: suppliers } = await supabase.from("suppliers").select("supplier_id").limit(1)
      if (!suppliers || suppliers.length === 0) {
        addLog("❌ No suppliers found, please create one first")
        return
      }

      // Get a product
      const { data: products } = await supabase.from("products").select("product_id").limit(1)
      if (!products || products.length === 0) {
        addLog("❌ No products found, please create one first")
        return
      }

      const supplierId = suppliers[0].supplier_id
      const productId = products[0].product_id

      addLog(`Using supplier ${supplierId} and product ${productId}`)

      // Insert purchase
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("purchases")
        .insert({ supplier_id: supplierId, purchase_date: new Date().toISOString() })
        .select()

      if (purchaseError) {
        addLog(`❌ Purchase insert failed: ${JSON.stringify(purchaseError)}`)
        return
      }

      addLog(`✅ Purchase created: ${JSON.stringify(purchaseData)}`)
      const purchaseId = purchaseData[0].purchase_id

      // Insert purchase detail
      const { data: detailData, error: detailError } = await supabase
        .from("purchase_details")
        .insert({
          purchase_id: purchaseId,
          product_id: productId,
          quantity: 10,
          price: 50.0
        })
        .select()

      if (detailError) {
        addLog(`❌ Purchase detail insert failed: ${JSON.stringify(detailError)}`)
        return
      }

      addLog(`✅ Purchase detail created: ${JSON.stringify(detailData)}`)

      // Verify data
      const { data: verifyData, error: verifyError } = await supabase
        .from("purchase_details")
        .select("*")
        .eq("purchase_id", purchaseId)

      if (verifyError) {
        addLog(`❌ Verification failed: ${JSON.stringify(verifyError)}`)
      } else {
        addLog(`✅ Verification: ${JSON.stringify(verifyData)}`)
      }
    } catch (err) {
      addLog(`❌ Error: ${err}`)
    }
  }

  const checkTables = async () => {
    setLogs([])
    addLog("Checking database tables...")

    const tables = ["suppliers", "products", "inventory", "purchases", "purchase_details", "sales", "sales_details", "stock_transactions"]

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("*").limit(5)
        if (error) {
          addLog(`❌ ${table}: ${JSON.stringify(error)}`)
        } else {
          addLog(`✅ ${table}: OK (${data?.length ?? 0} rows)`)
          if (data && data.length > 0) {
            addLog(`   Sample: ${JSON.stringify(data[0])}`)
          }
        }
      } catch (err) {
        addLog(`❌ ${table}: ${err}`)
      }
    }
  }

  const checkInventory = async () => {
    setLogs([])
    addLog("Checking inventory for all products...")

    try {
      // Get all products with their inventory
      const { data, error } = await supabase
        .from("products")
        .select(`
          product_id,
          product_name,
          inventory!left(stock_level)
        `)

      if (error) {
        addLog(`❌ Inventory check failed: ${JSON.stringify(error)}`)
        return
      }

      if (!data || data.length === 0) {
        addLog("❌ No products found")
        return
      }

      addLog(`✅ Found ${data.length} products:`)
      data.forEach((product: any) => {
        const stock = product.inventory?.stock_level || 0
        addLog(`   ${product.product_name}: ${stock} units`)
      })

      // Also check stock transactions
      const { data: transactions, error: txError } = await supabase
        .from("stock_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(10)

      if (txError) {
        addLog(`❌ Stock transactions check failed: ${JSON.stringify(txError)}`)
      } else {
        addLog(`✅ Recent stock transactions (${transactions?.length ?? 0}):`)
        transactions?.forEach((tx: any) => {
          addLog(`   ${tx.transaction_type} ${tx.quantity} units (ref: ${tx.reference_id})`)
        })
      }
    } catch (err) {
      addLog(`❌ Error: ${err}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Database Diagnostics</h1>

        <div className="space-y-3 mb-6">
          <button
            onClick={testConnection}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Test Connection
          </button>
          <button
            onClick={checkTables}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Check Tables
          </button>
          <button
            onClick={checkInventory}
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
          >
            Check Inventory Status
          </button>
          <button
            onClick={testInsertSupplier}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >
            Test Insert Supplier
          </button>
          <button
            onClick={testInsertProduct}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >
            Test Insert Product
          </button>
          <button
            onClick={testInsertPurchase}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
          >
            Test Full Purchase Workflow
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-3">Logs:</h2>
          <div className="bg-slate-100 p-4 rounded font-mono text-sm space-y-1 max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-slate-500">Click a button to run a test...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.includes("❌") ? "text-red-600" : "text-green-600"}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
