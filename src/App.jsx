import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AdminThemeProvider } from './context/AdminThemeContext'
import HomePage from './pages/HomePage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import CustomerAccountPage from './pages/CustomerAccountPage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import PaymentConfirmationPage from './pages/PaymentConfirmationPage'
import LegalPage from './pages/LegalPage'
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
import OwnerPayments from './pages/OwnerPayments'
import OwnerCustomers from './pages/OwnerCustomers'
import OwnerIntegrations from './pages/OwnerIntegrations'
import OwnerBroadcasts from './pages/OwnerBroadcasts'
import OwnerMarketing from './pages/OwnerMarketing'
import OwnerPaymentConfirmations from './pages/OwnerPaymentConfirmations'
import OwnerGuard from './components/OwnerGuard'

const owner = element => <OwnerGuard><AdminThemeProvider>{element}</AdminThemeProvider></OwnerGuard>

export default function App(){
  return <BrowserRouter><CartProvider><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/checkout" element={<CheckoutPage/>}/>
    <Route path="/articles" element={<ArticlesPage/>}/>
    <Route path="/article/:slug" element={<ArticleDetailPage/>}/>
    <Route path="/track-order" element={<OrderTrackingPage/>}/>
    <Route path="/payment-confirmation" element={<PaymentConfirmationPage/>}/>
    <Route path="/legal/:type" element={<LegalPage/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
    <Route path="/reset-password" element={<ResetPasswordPage/>}/>
    <Route path="/account" element={<CustomerAccountPage/>}/>

    <Route path="/owner" element={owner(<OwnerDashboard/>)}/>
    <Route path="/owner/orders" element={owner(<OwnerOrders/>)}/>
    <Route path="/owner/payment-confirmations" element={owner(<OwnerPaymentConfirmations/>)}/>
    <Route path="/owner/pos" element={owner(<OwnerPOS/>)}/>
    <Route path="/owner/products" element={owner(<OwnerProducts/>)}/>
    <Route path="/owner/categories" element={owner(<OwnerCategories/>)}/>
    <Route path="/owner/coupons" element={owner(<OwnerCoupons/>)}/>
    <Route path="/owner/articles" element={owner(<OwnerArticles/>)}/>
    <Route path="/owner/inventory" element={owner(<OwnerInventory/>)}/>
    <Route path="/owner/shipping" element={owner(<OwnerShipping/>)}/>
    <Route path="/owner/payments" element={owner(<OwnerPayments/>)}/>
    <Route path="/owner/customers" element={owner(<OwnerCustomers/>)}/>
    <Route path="/owner/broadcasts" element={owner(<OwnerBroadcasts/>)}/>
    <Route path="/owner/integrations" element={owner(<OwnerIntegrations/>)}/>
    <Route path="/owner/marketing" element={owner(<OwnerMarketing/>)}/>
    <Route path="/owner/staff" element={owner(<OwnerStaff/>)}/>
    <Route path="/owner/reports" element={owner(<OwnerReports/>)}/>
    <Route path="/owner/settings" element={owner(<OwnerSettings/>)}/>
    <Route path="/owner/guides" element={owner(<OwnerGuides/>)}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></CartProvider></BrowserRouter>
}
