"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

interface Sale {
  sale_id: string
  product_name: string
  quantity_sold: number
  price: number
  sale_date: string
}

interface Product {
  product_id: string
  product_name: string
  selling_price: number
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10))
  const [availableStock, setAvailableStock] = useState(0)
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState("")
  const [editPrice, setEditPrice] = useState("")

  const totalSales = sales.length
  const totalValue = sales.reduce((sum, s) => sum + s.price * s.quantity_sold, 0)

  const handleProductChange = async (productId: string) => {
    setSelectedProduct(productId)
    const product = products.find(p => p.product_id === productId)
    if (product) {
      setPrice(product.selling_price.toString())
    }

    // Fetch available stock for the selected product
    if (productId) {
      try {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("stock_level")
          .eq("product_id", productId)
          .single()

        if (inventoryError && inventoryError.code !== "PGRST116") {
          console.error("Error fetching stock:", inventoryError)
          setAvailableStock(0)
        } else {
          setAvailableStock(inventoryData?.stock_level ?? 0)
        }
      } catch (err) {
        console.error("Error fetching available stock:", err)
        setAvailableStock(0)
      }
    } else {
      setAvailableStock(0)
    }
  }

  async function loadSales() {
    setLoading(true)
    console.log("Loading sales...")
    try {
      const { data: salesDetailsData, error: detailsError } = await supabase
        .from("sales_details")
        .select("*")
      
      if (detailsError) {
        console.error("Error loading sales_details:", detailsError)
        setLoading(false)
        return
      }

      console.log("Sales details data:", salesDetailsData)

      if (!salesDetailsData || salesDetailsData.length === 0) {
        console.log("No sales details found")
        setSales([])
        setLoading(false)
        return
      }

      // Manually fetch related data
      const { data: salesData } = await supabase.from("sales").select("*")
      const { data: productsData } = await supabase.from("products").select("*")

      console.log("Sales:", salesData)
      console.log("Products:", productsData)

      // Build maps for quick lookup
      const salesMap = new Map(salesData?.map((s: any) => [s.sale_id, s]) ?? [])
      const productsMap = new Map(productsData?.map((p: any) => [p.product_id, p]) ?? [])

      // Combine data
      const formattedSales = salesDetailsData.map((detail: any) => {
        const sale = salesMap.get(detail.sale_id)
        const product = productsMap.get(detail.product_id)

        return {
          sale_id: detail.sale_id,
          product_name: product?.product_name || "Unknown Product",
          quantity_sold: detail.quantity_sold,
          price: detail.price,
          sale_date: sale?.sale_date || ""
        }
      })

      console.log("Formatted sales:", formattedSales)
      setSales(formattedSales)
    } catch (err) {
      console.error("Unexpected error loading sales:", err)
    }
    setLoading(false)
  }

  async function loadProducts() {
    const { data, error } = await supabase.from("products").select("product_id, product_name, selling_price")
    if (!error) {
      setProducts(data ?? [])
    }
  }

  async function handleAddSale(event: React.FormEvent) {
    event.preventDefault()
    console.log("Starting sale submit with:", { selectedProduct, quantity, price: price, date })

    const quantityValue = Number(quantity)
    const priceValue = Number(price)
    console.log("Parsed values:", { quantityValue, priceValue })
    
    if (isNaN(quantityValue) || quantityValue <= 0 || isNaN(priceValue) || priceValue < 0) {
      alert("Enter valid quantity and price values")
      return
    }

    if (!selectedProduct) {
      alert("Please select a product")
      return
    }

    // Check if quantity exceeds available stock
    if (quantityValue > availableStock) {
      alert(`Cannot sell ${quantityValue} units. Only ${availableStock} units available in stock.`)
      return
    }

    // Create sale
    console.log("Creating sale record...")
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({ sale_date: date })
      .select("sale_id")
      .single()
    if (saleError) {
      console.error("Could not create sale", saleError)
      alert("Error creating sale: " + JSON.stringify(saleError))
      return
    }
    console.log("Sale created:", saleData)
    const saleId = saleData.sale_id

    // Create sales detail
    console.log("Inserting sales detail...")
    const { error: detailError } = await supabase
      .from("sales_details")
      .insert({ sale_id: saleId, product_id: selectedProduct, quantity_sold: quantityValue, price: priceValue })
    if (detailError) {
      console.error("Could not add sales detail", detailError)
      alert("Error adding sales detail: " + JSON.stringify(detailError))
      return
    }
    console.log("Sales detail created successfully")

    // Update inventory (deduct sold quantity)
    try {
      await adjustInventory(selectedProduct, -quantityValue)
    } catch (err) {
      console.error("Could not adjust inventory", err)
      alert("Error updating inventory: " + err)
      return
    }

    // Add stock transaction
    console.log("Adding stock transaction...")
    const { error: transactionError } = await supabase
      .from("stock_transactions")
      .insert({ product_id: selectedProduct, quantity: quantityValue, transaction_type: 'OUT', reference_id: saleId })
    if (transactionError) {
      console.error("Could not add stock transaction", transactionError)
      alert("Error adding stock transaction: " + JSON.stringify(transactionError))
      return
    }
    console.log("Stock transaction added successfully")

    console.log("All operations completed, reloading sales...")
    setSelectedProduct("")
    setQuantity("")
    setPrice("")
    setAvailableStock(0)
    setDate(new Date().toISOString().substring(0, 10))
    await loadSales()
    await loadProducts()
    alert("Sale added successfully!")
  }

  async function adjustInventory(productId: string, quantityDelta: number) {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("stock_level")
      .eq("product_id", productId)
      .single()

    if (inventoryError && inventoryError.code !== "PGRST116") {
      throw new Error("Inventory read failed: " + JSON.stringify(inventoryError))
    }

    const currentStock = inventoryData?.stock_level || 0
    const updatedStock = currentStock + quantityDelta
    if (updatedStock < 0) {
      throw new Error("Insufficient stock to adjust by " + quantityDelta)
    }

    const updateResult = inventoryData
      ? await supabase.from("inventory").update({ stock_level: updatedStock }).eq("product_id", productId)
      : await supabase.from("inventory").insert({ product_id: productId, stock_level: updatedStock })

    if (updateResult.error) {
      throw new Error("Inventory update failed: " + JSON.stringify(updateResult.error))
    }

    return updatedStock
  }

  async function handleDeleteSale(saleId: string) {
    if (!confirm("Are you sure you want to delete this sale?")) return

    try {
      const { data: details, error: detailFetchError } = await supabase
        .from("sales_details")
        .select("product_id, quantity_sold")
        .eq("sale_id", saleId)
        .single()

      if (detailFetchError) {
        alert("Error loading sale detail: " + JSON.stringify(detailFetchError))
        return
      }

      // Roll back inventory for deleted sale
      await adjustInventory(details.product_id, details.quantity_sold || 0)

      // Delete stock transaction
      const { error: transactionError } = await supabase
        .from("stock_transactions")
        .delete()
        .eq("reference_id", saleId)
        .eq("transaction_type", "OUT")

      if (transactionError) {
        console.error("Warning: Could not delete stock transaction:", transactionError)
      }

      // Delete sales detail
      const { error: detailError } = await supabase
        .from("sales_details")
        .delete()
        .eq("sale_id", saleId)

      if (detailError) {
        alert("Error deleting sale detail: " + JSON.stringify(detailError))
        return
      }

      // Delete sale
      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("sale_id", saleId)

      if (saleError) {
        alert("Error deleting sale: " + JSON.stringify(saleError))
        return
      }

      alert("Sale deleted successfully!")
      await loadSales()
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function handleEditSale(sale: Sale) {
    setEditingId(sale.sale_id)
    setEditQuantity(sale.quantity_sold.toString())
    setEditPrice(sale.price.toString())

    // Find the product and fetch current available stock
    const product = products.find(p => p.product_name === sale.product_name)
    if (product) {
      try {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("stock_level")
          .eq("product_id", product.product_id)
          .single()

        if (inventoryError && inventoryError.code !== "PGRST116") {
          console.error("Error fetching stock for edit:", inventoryError)
          setAvailableStock(0)
        } else {
          // Add back the quantity being edited to show available stock including current sale
          const currentStock = inventoryData?.stock_level ?? 0
          setAvailableStock(currentStock + sale.quantity_sold)
        }
      } catch (err) {
        console.error("Error fetching available stock for edit:", err)
        setAvailableStock(0)
      }
    }
  }

  async function handleUpdateSale(saleId: string) {
    const quantityValue = Number(editQuantity)
    const priceValue = Number(editPrice)

    if (isNaN(quantityValue) || quantityValue <= 0 || isNaN(priceValue) || priceValue < 0) {
      alert("Enter valid quantity and price values")
      return
    }

    // Check if new quantity exceeds available stock
    if (quantityValue > availableStock) {
      alert(`Cannot update sale to ${quantityValue} units. Only ${availableStock} units available in stock.`)
      return
    }

    try {
      const { data: existingDetails, error: detailError } = await supabase
        .from("sales_details")
        .select("product_id, quantity_sold")
        .eq("sale_id", saleId)
        .single()

      if (detailError) {
        alert("Error loading existing sale detail: " + JSON.stringify(detailError))
        return
      }

      const deltaQuantity = quantityValue - (existingDetails?.quantity_sold || 0)
      if (deltaQuantity !== 0) {
        // reduce inventory for increased sale, restore for decreased sale
        await adjustInventory(existingDetails.product_id, -deltaQuantity)
      }

      const { error } = await supabase
        .from("sales_details")
        .update({ quantity_sold: quantityValue, price: priceValue })
        .eq("sale_id", saleId)

      if (error) {
        alert("Error updating sale: " + JSON.stringify(error))
        return
      }

      // Update stock transaction to keep report consistent
      const { error: transactionUpdateError } = await supabase
        .from("stock_transactions")
        .update({ quantity: quantityValue })
        .eq("reference_id", saleId)
        .eq("transaction_type", "OUT")

      if (transactionUpdateError) {
        console.error("Warning: Could not update stock transaction:", transactionUpdateError)
      }

      alert("Sale updated successfully!")
      setEditingId(null)
      await loadSales()
    } catch (err) {
      alert("Error: " + err)
    }
  }

  useEffect(() => {
    loadSales()
    loadProducts()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Sales</h1>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">Total Sales</p>
            <p className="text-2xl font-bold">{totalSales}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500">Net Movement</p>
            <p className="text-2xl font-bold">+{totalSales}</p>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Add Sale</h2>
          <form onSubmit={handleAddSale} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
              required
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Quantity Sold (e.g., 5)"
              value={quantity}
              min={1}
              max={availableStock}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
              required
            />
            {selectedProduct && (
              <div className="text-xs text-slate-600 mt-1">
                Available: {availableStock} units
              </div>
            )}
            <input
              type="number"
              placeholder="Selling Price per unit (e.g., 120.50)"
              value={price}
              min={0}
              step="0.01"
              onChange={(e) => setPrice(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
              required
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
              required
            />
            <button
              type="submit"
              className="col-span-1 md:col-span-5 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Add Sale
            </button>
          </form>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Sales Records</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Quantity Sold</th>
                    <th className="p-2 border">Price</th>
                    <th className="p-2 border">Total</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.sale_id}>
                      <td className="p-2 border">{sale.product_name}</td>
                      <td className="p-2 border">
                        {editingId === sale.sale_id ? (
                          <div>
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-20 border rounded px-1"
                              min="1"
                              max={availableStock}
                            />
                            <div className="text-xs text-slate-600 mt-1">
                              Available: {availableStock} units
                            </div>
                          </div>
                        ) : (
                          sale.quantity_sold
                        )}
                      </td>
                      <td className="p-2 border">
                        {editingId === sale.sale_id ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 border rounded px-1"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `₹${sale.price}`
                        )}
                      </td>
                      <td className="p-2 border">₹{sale.price * sale.quantity_sold}</td>
                      <td className="p-2 border">{new Date(sale.sale_date).toLocaleDateString()}</td>
                      <td className="p-2 border space-x-1">
                        {editingId === sale.sale_id ? (
                          <>
                            <button
                              onClick={() => handleUpdateSale(sale.sale_id)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setAvailableStock(0)
                              }}
                              className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditSale(sale)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale.sale_id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
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
