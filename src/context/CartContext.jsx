import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'imerswastore_cart_v2'

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)), [cart])

  const addItem = (product, qty = 1, customerInputs = {}, variant = null) => {
    const key = `${product.id}:${variant?.id||'base'}:${JSON.stringify(customerInputs)}`
    const effectiveProduct = variant ? {
      ...product,
      price:Number(variant.price||product.price||0),
      image_url:variant.image_url||product.image_url,
      selected_variant:variant,
      variant_id:variant.id,
    } : product
    setCart(prev => {
      const found = prev.find(item => item.key === key)
      return found
        ? prev.map(item => item.key === key ? { ...item, qty: item.qty + qty } : item)
        : [...prev, { key, product:effectiveProduct, qty, customer_inputs: customerInputs, variant_id:variant?.id||null }]
    })
  }
  const updateQty = (key, qty) => setCart(prev => prev.map(i => i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
  const removeItem = key => setCart(prev => prev.filter(i => i.key !== key))
  const clearCart = () => setCart([])
  const count = useMemo(() => cart.reduce((n, i) => n + i.qty, 0), [cart])
  const subtotal = useMemo(() => cart.reduce((n, i) => n + Number(i.product.price || 0) * i.qty, 0), [cart])
  const weight = useMemo(() => cart.reduce((n,i)=>n+Number(i.product.selected_variant?.weight_grams ?? i.product.weight_grams ?? 0)*i.qty,0),[cart])
  return <CartContext.Provider value={{ cart, addItem, updateQty, removeItem, clearCart, count, subtotal, weight }}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
