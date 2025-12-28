import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, RefreshCw, Trash2, CreditCard, LayoutDashboard, Store, Search, History, Tag, Printer } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos'); // 'pos', 'dashboard', 'history'
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0); // ဘောက်ချာတစ်ခုလုံးအတွက် Discount
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesSummary, setSalesSummary] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchSalesToday();
    fetchRecentOrders();
    const channel = supabase.channel('realtime-pos').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'products' }, () => fetchProducts()).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
  }

  async function fetchRecentOrders() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10);
    setRecentOrders(data || []);
  }

  async function fetchSalesToday() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('orders').select('total_amount').gte('created_at', today);
    const total = data?.reduce((sum, item) => sum + Number(item.total_amount), 0);
    setSalesSummary(total || 0);
  }

  const addToCart = (p) => {
    if (p.stock_quantity <= 0) return alert("ပစ္စည်းပြတ်နေပါသည်");
    setCart([...cart, { ...p, cartId: Math.random() }]);
  };

  const subtotal = cart.reduce((acc, curr) => acc + curr.price, 0);
  const finalTotal = subtotal - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const { data, error } = await supabase.from('orders').insert([{ total_amount: finalTotal }]).select();
    
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: 1 });
      }
      alert("ရောင်းချမှု အောင်မြင်ပါသည်။");
      setCart([]);
      setDiscount(0);
      fetchSalesToday();
      fetchRecentOrders();
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Top Navigation */}
      <div style={{ background: '#0f172a', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Smart POS Pro 💎</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setView('pos')} style={navBtnStyle}><Store size={18}/> အရောင်း</button>
          <button onClick={() => setView('history')} style={navBtnStyle}><History size={18}/> စာရင်းဟောင်း</button>
          <button onClick={() => setView('dashboard')} style={navBtnStyle}><LayoutDashboard size={18}/> Dashboard</button>
        </div>
      </div>

      {view === 'pos' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Menu Area */}
          <div style={{ flex: 1, padding: '20px', background: '#f8fafc', overflowY: 'auto' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} size={20}/>
                <input type="text" placeholder="ပစ္စည်းအမည်ဖြင့် ရှာရန်..." style={searchInputStyle} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart(p)} style={productCardStyle(p.stock_quantity)}>
                  <div style={{fontSize:'35px'}}>📦</div>
                  <b style={{fontSize:'14px'}}>{p.name}</b>
                  <div style={{color:'#2563eb', fontWeight:'bold'}}>{p.price.toLocaleString()} MMK</div>
                  <div style={{fontSize:'11px', color:'#64748b'}}>Stock: {p.stock_quantity}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Area */}
          <div style={cartContainerStyle}>
            <h3>🛒 လက်ရှိပြေစာ</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={cartItemStyle}>
                  <span>{item.name}</span>
                  <span>{item.price.toLocaleString()} <Trash2 size={14} color="#ef4444" onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{cursor:'pointer'}}/></span>
                </div>
              ))}
            </div>
            
            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '15px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Subtotal:</span>
                  <span>{subtotal.toLocaleString()} MMK</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: '#16a34a' }}>
                  <span><Tag size={14}/> Discount:</span>
                  <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} style={discountInputStyle} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>
                  <span>Total:</span>
                  <span>{finalTotal.toLocaleString()} MMK</span>
               </div>
               <button onClick={handleCheckout} style={checkoutBtnStyle}><CreditCard size={20}/> Pay Now</button>
            </div>
          </div>
        </div>
      ) : view === 'history' ? (
        <div style={{ padding: '30px', flex: 1, background: '#f8fafc' }}>
          <h2>📜 နောက်ဆုံးရောင်းရငွေ စာရင်းများ</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{background: '#f1f5f9'}}>
                <th style={thStyle}>အချိန်</th>
                <th style={thStyle}>ဘောင်ချာနံပါတ်</th>
                <th style={thStyle}>စုစုပေါင်း</th>
                <th style={thStyle}>လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                  <td style={tdStyle}>{new Date(order.created_at).toLocaleString()}</td>
                  <td style={tdStyle}>#{order.id.slice(0,8)}</td>
                  <td style={tdStyle}>{order.total_amount.toLocaleString()} MMK</td>
                  <td style={tdStyle}><button style={printBtnStyle} onClick={() => window.print()}><Printer size={14}/> Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '40px', flex: 1, background: '#f8fafc' }}>
          <h1>📊 Dashboard အနှစ်ချုပ်</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={dashCardStyle}>
              <h3 style={{color:'#64748b'}}>ယနေ့စုစုပေါင်းရောင်းရငွေ</h3>
              <p style={{fontSize: '40px', fontWeight: 'bold', color: '#16a34a'}}>{salesSummary.toLocaleString()} MMK</p>
            </div>
            <div style={dashCardStyle}>
              <h3 style={{color:'#64748b'}}>စတော့ပြတ်ခါနီး ပစ္စည်းများ</h3>
              {products.filter(p => p.stock_quantity < 5).map(p => (
                <div key={p.id} style={{color: '#ef4444', padding: '5px 0'}}>⚠️ {p.name} (ကျန်: {p.stock_quantity})</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const navBtnStyle = { background: '#1e293b', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' };
const searchInputStyle = { width: '100%', padding: '12px 45px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px' };
const productCardStyle = (stock) => ({ background: 'white', padding: '15px', borderRadius: '15px', textAlign: 'center', cursor: stock > 0 ? 'pointer' : 'not-allowed', opacity: stock > 0 ? 1 : 0.6, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' });
const cartContainerStyle = { width: '380px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px' };
const cartItemStyle = { display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '8px', fontSize: '14px' };
const discountInputStyle = { width: '100px', padding: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', textAlign: 'right' };
const checkoutBtnStyle = { width: '100%', padding: '18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thStyle = { padding: '15px', textAlign: 'left', fontSize: '14px', color: '#64748b' };
const tdStyle = { padding: '15px', fontSize: '14px', color: '#1e293b' };
const printBtnStyle = { padding: '5px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white' };
const dashCardStyle = { background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0' };
