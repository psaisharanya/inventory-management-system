"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

type Purchase = {
  purchase_id: string
  supplier_name: string
  product_name: string
  quantity: number
  price: number
  purchase_date: string
}

type Supplier = {
  supplier_id: string
  supplier_name: string
}

type Product = {
  product_id: string
  product_name: string
  cost_price: number
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10))
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState("")
  const [editPrice, setEditPrice] = useState("")

  const totalOrders = purchases.length
  const totalValue = purchases.reduce((sum, p) => sum + p.price * p.quantity, 0)

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId)
    const product = products.find(p => p.product_id === productId)
    if (product) {
      setPrice(product.cost_price.toString())
    }
  }

  async function loadPurchases() {
    setLoading(true)
    console.log("Loading purchases...")
    try {
      const { data: purchaseDetailsData, error: detailsError } = await supabase
        .from("purchase_details")
        .select("*")
      
      if (detailsError) {
        console.error("Error loading purchase_details:", detailsError)
        setLoading(false)
        return
      }

      console.log("Purchase details data:", purchaseDetailsData)

      if (!purchaseDetailsData || purchaseDetailsData.length === 0) {
        console.log("No purchase details found")
        setPurchases([])
        setLoading(false)
        return
      }

      // Manually fetch related data
      const { data: purchasesData } = await supabase.from("purchases").select("*")
      const { data: suppliersData } = await supabase.from("suppliers").select("*")
      const { data: productsData } = await supabase.from("products").select("*")

      console.log("Purchases:", purchasesData)
      console.log("Suppliers:", suppliersData)
      console.log("Products:", productsData)

      // Build maps for quick lookup
      const purchasesMap = new Map(purchasesData?.map((p: any) => [p.purchase_id, p]) ?? [])
      const suppliersMap = new Map(suppliersData?.map((s: any) => [s.supplier_id, s]) ?? [])
      const productsMap = new Map(productsData?.map((p: any) => [p.product_id, p]) ?? [])

      // Combine data
      const formattedPurchases = purchaseDetailsData.map((detail: any) => {
        const purchase = purchasesMap.get(detail.purchase_id)
        const supplier = suppliersMap.get(purchase?.supplier_id)
        const product = productsMap.get(detail.product_id)

        return {
          purchase_id: detail.purchase_id,
          supplier_name: supplier?.supplier_name || "Unknown Supplier",
          product_name: product?.product_name || "Unknown Product",
          quantity: detail.quantity,
          price: detail.price,
          purchase_date: purchase?.purchase_date || ""
        }
      })

      console.log("Formatted purchases:", formattedPurchases)
      setPurchases(formattedPurchases)
    } catch (err) {
      console.error("Unexpected error loading purchases:", err)
    }
    setLoading(false)
  }

  async function loadSuppliersAndProducts() {
    const [suppliersRes, productsRes] = await Promise.all([
      supabase.from("suppliers").select("supplier_id, supplier_name"),
      supabase.from("products").select("product_id, product_name, cost_price")
    ])
    setSuppliers(suppliersRes.data ?? [])
    setProducts(productsRes.data ?? [])
  }

  async function handleAddPurchase(event: React.FormEvent) {
    event.preventDefault()
    console.log("Starting purchase submit with:", { selectedSupplier, selectedProduct, quantity, price, date })
    
    // Validate inputs
    if (!selectedSupplier) {
      alert("Please select a supplier")
      return
    }
    if (!selectedProduct) {
      alert("Please select a product")
      return
    }
    
    // Create purchase
    console.log("Creating purchase record...")
    const { data: purchaseData, error: purchaseError } = await supabase
      .from("purchases")
      .insert({ supplier_id: selectedSupplier, purchase_date: date })
      .select("purchase_id")
      .single()
    if (purchaseError) {
      console.error("Could not create purchase", purchaseError)
      alert("Error creating purchase: " + JSON.stringify(purchaseError))
      return
    }
    console.log("Purchase created:", purchaseData)
    const purchaseId = purchaseData.purchase_id

    // Create purchase detail
    const quantityValue = Number(quantity)
    const priceValue = Number(price)
    console.log("Parsed values:", { quantityValue, priceValue })
    
    if (isNaN(quantityValue) || quantityValue <= 0 || isNaN(priceValue) || priceValue < 0) {
      alert("Enter valid quantity and price values")
      return
    }

    console.log("Inserting purchase detail...")
    const { error: detailError } = await supabase
      .from("purchase_details")
      .insert({ purchase_id: purchaseId, product_id: selectedProduct, quantity: quantityValue, price: priceValue })
    if (detailError) {
      console.error("Could not add purchase detail", detailError)
      alert("Error adding purchase detail: " + JSON.stringify(detailError))
      return
    }
    console.log("Purchase detail created successfully")

    // Update inventory (upsert)
    console.log("Fetching current inventory for product:", selectedProduct)
    const { data: inventoryData, error: inventoryFetchError } = await supabase
      .from("inventory")
      .select("stock_level")
      .eq("product_id", selectedProduct)
      .single()
    console.log("Inventory fetch result:", { inventoryData, inventoryFetchError })
    if (inventoryFetchError && inventoryFetchError.code !== "PGRST116") {
      console.error("Could not fetch inventory", inventoryFetchError)
      alert("Error fetching inventory: " + JSON.stringify(inventoryFetchError))
      return
    }
    console.log("Current inventory:", inventoryData)

    const newStock = (inventoryData?.stock_level || 0) + quantityValue
    console.log("Calculating new stock:", newStock)
    const inventoryUpdate = inventoryData
      ? supabase.from("inventory").update({ stock_level: newStock }).eq("product_id", selectedProduct)
      : supabase.from("inventory").insert({ product_id: selectedProduct, stock_level: newStock })
    console.log("Inventory update query:", inventoryUpdate)

    const { error: inventoryError } = await inventoryUpdate
    console.log("Inventory update result:", { error: inventoryError })
    if (inventoryError) {
      console.error("Could not update inventory", inventoryError)
      alert("Error updating inventory: " + JSON.stringify(inventoryError))
      return
    }
    console.log("Inventory updated successfully to:", newStock)

    // Add stock transaction
    console.log("Adding stock transaction...")
    const { error: transactionError } = await supabase
      .from("stock_transactions")
      .insert({ product_id: selectedProduct, quantity: quantityValue, transaction_type: 'IN', reference_id: purchaseId })
    if (transactionError) {
      console.error("Could not add stock transaction", transactionError)
      alert("Error adding stock transaction: " + JSON.stringify(transactionError))
      return
    }
    console.log("Stock transaction added successfully")

    console.log("All operations completed, reloading purchases...")
    setSelectedSupplier("")
    setSelectedProduct("")
    setQuantity("")
    setPrice("")
    setDate(new Date().toISOString().substring(0, 10))
    await loadPurchases()
    await loadSuppliersAndProducts()
    alert("Purchase added successfully!")
  }

  async function adjustInventory(productId: string, quantityChange: number) {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("stock_level")
      .eq("product_id", productId)
      .single()

    if (inventoryError && inventoryError.code !== "PGRST116") {
      throw new Error("Inventory read failed: " + JSON.stringify(inventoryError))
    }

    const currentStock = inventoryData?.stock_level || 0
    const updatedStock = currentStock + quantityChange
    if (updatedStock < 0) {
      throw new Error("Insufficient stock to adjust by " + quantityChange)
    }

    const updateResult = inventoryData
      ? await supabase.from("inventory").update({ stock_level: updatedStock }).eq("product_id", productId)
      : await supabase.from("inventory").insert({ product_id: productId, stock_level: updatedStock })

    if (updateResult.error) {
      throw new Error("Inventory update failed: " + JSON.stringify(updateResult.error))
    }

    return updatedStock
  }

  async function handleDeletePurchase(purchaseId: string) {
    if (!confirm("Are you sure you want to delete this purchase?")) return

    try {
      const { data: details, error: detailFetchError } = await supabase
        .from("purchase_details")
        .select("product_id, quantity")
        .eq("purchase_id", purchaseId)
        .single()

      if (detailFetchError) {
        alert("Error loading purchase detail: " + JSON.stringify(detailFetchError))
        return
      }

      // Adjust inventory (reverse quantity from purchase)
      await adjustInventory(details.product_id, -(details.quantity || 0))

      // Delete stock transaction
      const { error: transactionError } = await supabase
        .from("stock_transactions")
        .delete()
        .eq("reference_id", purchaseId)
        .eq("transaction_type", "IN")

      if (transactionError) {
        console.error("Warning: Could not delete stock transaction:", transactionError)
      }

      // Delete purchase detail
      const { error: detailError } = await supabase
        .from("purchase_details")
        .delete()
        .eq("purchase_id", purchaseId)

      if (detailError) {
        alert("Error deleting purchase detail: " + JSON.stringify(detailError))
        return
      }

      // Delete purchase
      const { error: purchaseError } = await supabase
        .from("purchases")
        .delete()
        .eq("purchase_id", purchaseId)

      if (purchaseError) {
        alert("Error deleting purchase: " + JSON.stringify(purchaseError))
        return
      }

      alert("Purchase deleted successfully!")
      await loadPurchases()
    } catch (err) {
      alert("Error: " + err)
    }
  }

  async function handleEditPurchase(purchase: Purchase) {
    setEditingId(purchase.purchase_id)
    setEditQuantity(purchase.quantity.toString())
    setEditPrice(purchase.price.toString())
  }

  async function handleUpdatePurchase(purchaseId: string) {
    const quantityValue = Number(editQuantity)
    const priceValue = Number(editPrice)

    if (isNaN(quantityValue) || quantityValue <= 0 || isNaN(priceValue) || priceValue < 0) {
      alert("Enter valid quantity and price values")
      return
    }

    try {
      // Load existing purchase detail for inventory delta
      const { data: existingDetails, error: existingError } = await supabase
        .from("purchase_details")
        .select("product_id, quantity")
        .eq("purchase_id", purchaseId)
        .single()

      if (existingError) {
        alert("Error loading existing purchase detail: " + JSON.stringify(existingError))
        return
      }

      const deltaQuantity = quantityValue - (existingDetails?.quantity || 0)

      // Update inventory by delta
      if (deltaQuantity !== 0) {
        await adjustInventory(existingDetails.product_id, deltaQuantity)
      }

      const { error } = await supabase
        .from("purchase_details")
        .update({ quantity: quantityValue, price: priceValue })
        .eq("purchase_id", purchaseId)

      if (error) {
        alert("Error updating purchase: " + JSON.stringify(error))
        return
      }

      // Update stock transaction for this purchase
      await supabase
        .from("stock_transactions")
        .update({ quantity: quantityValue })
        .eq("reference_id", purchaseId)
        .eq("transaction_type", "IN")

      alert("Purchase updated successfully!")
      setEditingId(null)
      await loadPurchases()
    } catch (err) {
      alert("Error: " + err)
    }
  }

  useEffect(() => {
    loadPurchases()
    loadSuppliersAndProducts()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Purchases</h1>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-2">Recent Purchases</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {purchases.slice(0, 5).map((purchase) => (
                  <li key={purchase.purchase_id} className="flex justify-between border-b pb-2">
                    <span>{purchase.product_name}</span>
                    <strong>+{purchase.quantity}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-2">Purchase Summary</h2>
            <p className="text-sm text-slate-600">Total orders this month: {totalOrders}</p>
            <p className="text-sm text-slate-600">Total value: ₹{totalValue.toLocaleString()}</p>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Add Purchase</h2>
          <form onSubmit={handleAddPurchase} className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.supplier_name}
                </option>
              ))}
            </select>
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
              placeholder="Quantity (e.g., 10)"
              value={quantity}
              min={1}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
              required
            />
            <input
              type="number"
              placeholder="Price per unit (e.g., 75.00)"
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
              className="col-span-1 md:col-span-6 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Add Purchase
            </button>
          </form>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">All Purchases</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">Supplier</th>
                  <th className="p-2 border">Product</th>
                  <th className="p-2 border">Quantity</th>
                  <th className="p-2 border">Price</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.purchase_id}>
                    <td className="p-2 border">{purchase.supplier_name}</td>
                    <td className="p-2 border">{purchase.product_name}</td>
                    <td className="p-2 border">
                      {editingId === purchase.purchase_id ? (
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-20 border rounded px-1"
                          min="1"
                        />
                      ) : (
                        purchase.quantity
                      )}
                    </td>
                    <td className="p-2 border">
                      {editingId === purchase.purchase_id ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 border rounded px-1"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        `₹${purchase.price}`
                      )}
                    </td>
                    <td className="p-2 border">₹{purchase.price * purchase.quantity}</td>
                    <td className="p-2 border">{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                    <td className="p-2 border space-x-1">
                      {editingId === purchase.purchase_id ? (
                        <>
                          <button
                            onClick={() => handleUpdatePurchase(purchase.purchase_id)}
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
                            onClick={() => handleEditPurchase(purchase)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(purchase.purchase_id)}
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
        </section>
      </div>
    </div>
  )
}
