import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import HomePage from './pages/HomePage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import OwnerProducts from './pages/OwnerProducts'
import OwnerInventory from './pages/OwnerInventory'
import OwnerReports from './pages/OwnerReports'
import OwnerSettings from './pages/OwnerSettings'
import OwnerGuard from './components/OwnerGuard'

const owner = element => <OwnerGuard>{element}</OwnerGuard>

export default function App(){
  return <BrowserRouter><CartProvider><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/checkout" element={<CheckoutPage/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/owner" element={owner(<OwnerDashboard/>)}/>
    <Route path="/owner/products" element={owner(<OwnerProducts/>)}/>
    <Route path="/owner/inventory" element={owner(<OwnerInventory/>)}/>
    <Route path="/owner/reports" element={owner(<OwnerReports/>)}/>
    <Route path="/owner/settings" element={owner(<OwnerSettings/>)}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></CartProvider></BrowserRouter>
}
