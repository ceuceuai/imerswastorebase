import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AdminThemeProvider } from './context/AdminThemeContext'
import HomePage from './pages/HomePage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import OwnerProducts from './pages/OwnerProducts'
import OwnerInventory from './pages/OwnerInventory'
import OwnerReports from './pages/OwnerReports'
import OwnerSettings from './pages/OwnerSettings'
import ArticlesPage from './pages/ArticlesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import OwnerArticles from './pages/OwnerArticles'
import OwnerCategories from './pages/OwnerCategories'
import OwnerOrders from './pages/OwnerOrders'
import OwnerShipping from './pages/OwnerShipping'
import OwnerCoupons from './pages/OwnerCoupons'
import OwnerPOS from './pages/OwnerPOS'
import OwnerStaff from './pages/OwnerStaff'
import OwnerGuides from './pages/OwnerGuides'
import OwnerGuard from './components/OwnerGuard'

const owner = element => <OwnerGuard><AdminThemeProvider>{element}</AdminThemeProvider></OwnerGuard>

export default function App(){
  return <BrowserRouter><CartProvider><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/checkout" element={<CheckoutPage/>}/>
    <Route path="/articles" element={<ArticlesPage/>}/>
    <Route path="/article/:slug" element={<ArticleDetailPage/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/owner" element={owner(<OwnerDashboard/>)}/>
    <Route path="/owner/orders" element={owner(<OwnerOrders/>)}/>
    <Route path="/owner/pos" element={owner(<OwnerPOS/>)}/>
    <Route path="/owner/products" element={owner(<OwnerProducts/>)}/>
    <Route path="/owner/categories" element={owner(<OwnerCategories/>)}/>
    <Route path="/owner/coupons" element={owner(<OwnerCoupons/>)}/>
    <Route path="/owner/articles" element={owner(<OwnerArticles/>)}/>
    <Route path="/owner/inventory" element={owner(<OwnerInventory/>)}/>
    <Route path="/owner/shipping" element={owner(<OwnerShipping/>)}/>
    <Route path="/owner/staff" element={owner(<OwnerStaff/>)}/>
    <Route path="/owner/reports" element={owner(<OwnerReports/>)}/>
    <Route path="/owner/settings" element={owner(<OwnerSettings/>)}/>
    <Route path="/owner/guides" element={owner(<OwnerGuides/>)}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></CartProvider></BrowserRouter>
}
