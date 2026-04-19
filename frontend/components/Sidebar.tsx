import Link from "next/link"
import { useRouter } from "next/navigation"

const links = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Purchases", href: "/purchases" },
  { title: "Products", href: "/products" },
  { title: "Inventory", href: "/inventory" },
  { title: "Sales", href: "/sales" },
  { title: "Transactions", href: "/transactions" },
  { title: "Suppliers", href: "/suppliers" },
  { title: "Reports", href: "/reports" },
]

export default function Sidebar() {
  const router = useRouter()

  return (
    <aside className="w-72 bg-slate-900 text-white p-6 min-h-screen">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">Inventory System</h1>
      </div>

      <nav className="space-y-2 text-sm">
        {links.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="block rounded-md px-3 py-2 hover:bg-slate-700 hover:text-white transition"
          >
            {item.title}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-700">
        <button
          onClick={() => {
            localStorage.removeItem("inventory-auth")
            router.push("/login")
          }}
          className="w-full text-left px-3 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
