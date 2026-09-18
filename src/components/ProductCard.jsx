import { Eye, Heart, ShoppingCart } from 'lucide-react'
import { rupiah } from '../lib/format'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product, onPreview }) {
  const { addItem } = useCart()
  const needsInput = Array.isArray(product.input_schema) && product.input_schema.some(f => f.required)
  const discount = product.compare_at_price > product.price ? Math.round((1 - product.price/product.compare_at_price) * 100) : 0
  return <article className="product-card">
    <div className="product-image-wrap">
      {product.badge && <span className="badge">{product.badge}</span>}
      {discount > 0 && !product.badge && <span className="badge">DISKON {discount}%</span>}
      <button className="heart-mini"><Heart size={17}/></button>
      <img className="product-image" src={product.image_url || 'https://placehold.co/600x600?text=Produk'} alt={product.name}/>
    </div>
    <div className="product-body"><h3>{product.name}</h3><p className="category-line">{product.category?.name || 'Produk'}</p>
      <div className="price-row"><strong>{product.product_type === 'game_topup' ? `Mulai ${rupiah(product.price)}` : rupiah(product.price)}</strong>{product.compare_at_price > product.price && <del>{rupiah(product.compare_at_price)}</del>}</div>
      <div className="rating">★ <span>4.8</span> <small>(96)</small></div>
      <div className="card-actions"><button className="btn-outline" onClick={()=>onPreview(product)}><Eye size={15}/> Preview</button><button className="btn-primary" onClick={()=>needsInput ? onPreview(product) : addItem(product,1,{})}><ShoppingCart size={15}/> Keranjang</button></div>
    </div>
  </article>
}
