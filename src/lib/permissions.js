export const routePermission = [
  ['/owner/orders','orders'],
  ['/owner/payment-confirmations','orders'],
  ['/owner/pos','pos'],
  ['/owner/products','products'],
  ['/owner/categories','products'],
  ['/owner/coupons','products'],
  ['/owner/articles','products'],
  ['/owner/inventory','inventory'],
  ['/owner/shipping','inventory'],
  ['/owner/payments','inventory'],
  ['/owner/reports','reports'],
]

export function canAccessRoute(account, pathname){
  if(!account || account.account_type!=='admin' || account.active===false)return false
  if(account.role==='owner' || account.role==='admin' || account.permissions?.all)return true
  if(pathname==='/owner')return true
  // Manager/staff-only modules that are intentionally owner-admin only.
  if(['/owner/staff','/owner/integrations','/owner/settings','/owner/guides','/owner/customers','/owner/broadcasts','/owner/marketing'].some(x=>pathname.startsWith(x)))return false
  const match=routePermission.find(([path])=>pathname.startsWith(path))
  return match ? !!account.permissions?.[match[1]] : false
}
