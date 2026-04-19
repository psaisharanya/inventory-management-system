"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Supplier = {
  supplier_id: string
  supplier_name: string
  contact: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editContact, setEditContact] = useState("")

  async function loadSuppliers() {
    setLoading(true)
    const { data, error } = await supabase
      .from("suppliers")
      .select("supplier_id, supplier_name, contact")
      .order("supplier_name", { ascending: true })

    if (error) {
      console.error("Could not load suppliers", error)
      setSuppliers([])
    } else {
      setSuppliers(data ?? [])
    }
    setLoading(false)
  }

  async function handleAddSupplier(event: React.FormEvent) {
    event.preventDefault()
    const { error } = await supabase
      .from("suppliers")
      .insert({ supplier_name: name, contact })

    if (error) {
      console.error("Could not add supplier", error)
      alert("Error adding supplier: " + error.message)
      return
    }

    setName("")
    setContact("")
    await loadSuppliers()
  }

  async function handleDeleteSupplier(supplierId: string) {
    if (!confirm("Are you sure you want to delete this supplier?")) return

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("supplier_id", supplierId)

    if (error) {
      alert("Error deleting supplier: " + error.message)
      return
    }

    alert("Supplier deleted successfully!")
    await loadSuppliers()
  }

  async function handleEditSupplier(supplier: Supplier) {
    setEditingId(supplier.supplier_id)
    setEditName(supplier.supplier_name)
    setEditContact(supplier.contact)
  }

  async function handleUpdateSupplier(supplierId: string) {
    if (!editName.trim()) {
      alert("Please enter a supplier name")
      return
    }

    const { error } = await supabase
      .from("suppliers")
      .update({ supplier_name: editName, contact: editContact })
      .eq("supplier_id", supplierId)

    if (error) {
      alert("Error updating supplier: " + error.message)
      return
    }

    setEditingId(null)
    await loadSuppliers()
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Suppliers</h1>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Add Supplier</h2>
          <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Supplier Name"
              className="rounded border border-slate-300 px-2 py-1"
              required
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact Information"
              className="rounded border border-slate-300 px-2 py-1"
              required
            />
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Add Supplier
            </button>
          </form>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-3">Supplier Directory</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">Supplier Name</th>
                    <th className="p-2 border">Contact</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.supplier_id}>
                      <td className="p-2 border">
                        {editingId === supplier.supplier_id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border rounded px-1"
                          />
                        ) : (
                          supplier.supplier_name
                        )}
                      </td>
                      <td className="p-2 border">
                        {editingId === supplier.supplier_id ? (
                          <input
                            type="text"
                            value={editContact}
                            onChange={(e) => setEditContact(e.target.value)}
                            className="w-full border rounded px-1"
                          />
                        ) : (
                          supplier.contact
                        )}
                      </td>
                      <td className="p-2 border space-x-1">
                        {editingId === supplier.supplier_id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateSupplier(supplier.supplier_id)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditSupplier(supplier)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(supplier.supplier_id)}
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
