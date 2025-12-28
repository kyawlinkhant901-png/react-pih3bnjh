import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Wifi, WifiOff, CloudUpload } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineOrders, setOfflineOrders] = useState(JSON.parse(localStorage.getItem('offline_orders')) || []);

  useEffect(() => {
    fetchProducts();
    // အင်တာနက် ရှိ/မရှိ စောင့်ကြည့်ခြင်း
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  async function fetchProducts() {
    if (isOnline) {
      const { data } = await supabase.from('products').select('*').order('name');
      setProducts(data || []);
      localStorage.setItem('products_cache', JSON.stringify(data)); // Offline အတွက် သိမ်းထားခြင်း
    } else {
      setProducts(JSON.parse(localStorage.getItem('products_cache')) || []);
    }
  }

  // --- အရောင်း (Checkout) ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + b.price, 0);
    const orderData = { total_amount: total, device_name: cart.map(i => i.name).join(', '), created_at: new Date() };

    if (isOnline) {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (!error) {
        alert("အရောင်းအောင်မြင်သည်။ (Online)");
      }
    } else {
      // Offline ဖြစ်နေလျှင် LocalStorage ထဲ သိမ်းမည်
      const newOfflineOrders = [...offlineOrders, orderData];
      setOfflineOrders(newOfflineOrders);
      localStorage.setItem('offline_orders', JSON.stringify(newOfflineOrders));
      alert("အင်တာနက်မရှိပါ။ စာရင်းကို ဖုန်းထဲမှာ ခဏသိမ်းထားလိုက်ပါပြီ။");
    }
    setCart([]);
  };

  // --- Offline ဒေတာများကို Online ပေါ်သို့ တင်ခြင်း ---
  const syncData = async () => {
    if (!isOnline || offlineOrders.length === 0) return;
    const { error } = await supabase.from('orders').insert(offlineOrders);
    if (!error) {
      alert("Offline စာရင်းအားလုံးကို Online သို့ ပို့ဆောင်ပြီးပါပြီ။");
      setOfflineOrders([]);
      localStorage.removeItem('offline_orders');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', background: '#1c1e21', color: '#fff', padding: '20px' }}>
        <div style={{ marginBottom: '20px', color: isOnline ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
          {isOnline ? <Wifi size={16}/> : <WifiOff size={16}/>}
          {isOnline ? 'Online Mode' : 'Offline Mode'}
        </div>
        
        {offlineOrders.length > 0 && isOnline && (
          <button onClick={syncData} style={syncBtn}>
            <CloudUpload size={18}/> Sync ({offlineOrders.length})
          </button>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setView('pos')} style={sidebarBtn}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('dashboard')} style={sidebarBtn}><LayoutDashboard size={18}/> Dashboard</button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px', background: '#f0f2f5', overflowY: 'auto' }}>
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <h3>ပစ္စည်းမီနူး {!isOnline && "(Offline)"}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {products.map(p => (
                  <div key={p.id} onClick={() => setCart([...cart, p])} style={itemCard}>
                    <b>{p.name}</b><br/>
                    <span>{p.price} K</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={cartPanel}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              {cart.map((c, i) => <div key={i} style={{borderBottom: '1px solid #eee', padding: '5px 0'}}>{c.name} - {c.price}</div>)}
              <h4 style={{marginTop: '20px'}}>Total: {cart.reduce((a,b)=>a+b.price,0)} K</h4>
              <button onClick={handleCheckout} style={btnPrimary}>
                {isOnline ? 'Checkout (Online)' : 'Save (Offline)'}
              </button>
            </div>
          </div>
        )}
        {/* Dashboard and other views... */}
      </div>
    </div>
  );
}

// Styles
const sidebarBtn = { width: '100%', padding: '12px', textAlign: 'left', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' };
const syncBtn = { width: '100%', padding: '10px', background: '#4e73df', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const itemCard = { background: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer' };
const cartPanel = { width: '300px', background: '#fff', padding: '20px', borderRadius: '10px' };
const btnPrimary = { width: '100%', padding: '12px', background: '#4e73df', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
