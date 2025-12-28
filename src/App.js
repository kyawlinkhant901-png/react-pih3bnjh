import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, RefreshCw, Trash2, CreditCard, LayoutDashboard, Store, Search, History, Tag, Printer, Filter, AlertTriangle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos'); 
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [discount, setDiscount] = useState(0);
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
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
    setRecentOrders(data || []);
  }

  async function fetchSalesToday() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('orders').select('total_amount').gte('created_at', today);
    setSalesSummary(data?.reduce((sum, item) => sum + Number(item.total_amount), 0) || 0);
  }

  const addToCart = (p) => {
    if (p.stock_quantity <= 0) return alert("ပစ္စည်းပြတ်နေပါသည်");
    setCart([...cart, { ...p, cartId: Math.random() }]);
  };

  const finalTotal = cart.reduce((acc, curr) => acc + curr.price, 0) - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const itemsList = cart.map(i => i.name).join(', '); // ရောင်းလိုက်တဲ့ ပစ္စည်းစာရင်း မှတ်ရန်
    
    const { error } = await supabase.from('orders').insert([{ total_amount: finalTotal, device_name: itemsList }]);
    
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: 1 });
      }
      alert("ရောင်းချမှု အောင်မြင်ပါသည်။");
      setCart([]); setDiscount(0); fetchSalesToday(); fetchRecentOrders();
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => 
    (selectedCat === 'All' || p.category === selectedCat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f1f5f9' }}>
      {/* Top Bar */}
      <div style={{ background: '#0f172a', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>🚀 SmartPOS Ultra</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setView('pos')} style={view === 'pos' ? activeNavStyle : navBtnStyle}><Store size={18}/> အရောင်း</button>
          <button onClick={() => setView('history')} style={view === 'history' ? activeNavStyle : navBtnStyle}><History size={18}/> စာရင်း</button>
          <button onClick={() => setView('dashboard')} style={view === 'dashboard' ? activeNavStyle : navBtnStyle}><LayoutDashboard size={18}/> Dashboard</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {view === 'pos' ? (
          <>
            {/* Left Side: Categories & Products */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCat(cat)} style={cat === selectedCat ? activeCatStyle : catStyle}>{cat}</button>
                ))}
              </div>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} size={18}/>
                <input type="text" placeholder="ပစ္စည်းရှာရန်..." style={searchInputStyle} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', overflowY: 'auto' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} style={productCardStyle(p.stock_quantity)}>
                    <div style={{fontSize: '30px', marginBottom: '5px'}}>📦</div>
                    <div style={{fontWeight: 'bold', fontSize: '14px', height: '35px', overflow: 'hidden'}}>{p.name}</div>
                    <div style={{color: '#2563eb', fontWeight: 'bold'}}>{p.price.toLocaleString()} K</div>
                    <div style={{fontSize: '11px', color: p.stock_quantity < 5 ? '#ef4444' : '#64748b'}}>Stock: {p.stock_quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Cart */}
            <div style={cartContainerStyle}>
              <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px'}}><ShoppingCart/> လက်ရှိပြေစာ</h3>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {cart.map((item, idx) => (
                  <div key={idx} style={cartItemStyle}>
                    <div style={{fontWeight: 'bold'}}>{item.name}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', color: '#64748b'}}>
                      <span>1 x {item.price.toLocaleString()}</span>
                      <Trash2 size={16} color="#ef4444" style={{cursor:'pointer'}} onClick={() => setCart(cart.filter((_, i) => i !== idx))}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                  <span>စုစုပေါင်း:</span>
                  <span>{(finalTotal + discount).toLocaleString()} MMK</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{color: '#16a34a'}}><Tag size={14}/> Discount:</span>
                  <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} style={discountInputStyle} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px' }}>
                  <span>Total:</span>
                  <span>{finalTotal.toLocaleString()} MMK</span>
                </div>
                <button onClick={handleCheckout} style={checkoutBtnStyle}>Pay Now & Print</button>
              </div>
            </div>
          </>
        ) : view === 'history' ? (
          <div style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
            <h2 style={{display: 'flex', alignItems: 'center', gap: '10px'}}><History/> အရောင်းမှတ်တမ်းများ</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {recentOrders.map(order => (
                <div key={order.id} style={orderHistoryCard}>
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '16px'}}>#{order.id.slice(0,8)}</div>
                    <div style={{fontSize: '12px', color: '#64748b'}}>{new Date(order.created_at).toLocaleString()}</div>
                    <div style={{fontSize: '13px', marginTop: '5px', color: '#1e293b'}}>Items: {order.device_name || 'N/A'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '18px' }}>{order.total_amount.toLocaleString()} K</div>
                    <button style={printMiniBtn} onClick={() => window.print()}><Printer size={14}/> Re-print</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
            <h1>📊 လုပ်ငန်းအနှစ်ချုပ် Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={statCard('#16a34a')}>
                <h3 style={{margin:0}}>ယနေ့စုစုပေါင်းရောင်းရငွေ</h3>
                <div style={{fontSize: '45px', fontWeight: 'bold', marginTop: '10px'}}>{salesSummary.toLocaleString()} MMK</div>
              </div>
              <div style={statCard('#ef4444')}>
                <h3 style={{margin:0, display: 'flex', alignItems: 'center', gap: '10px'}}><AlertTriangle/> စတော့ကုန်ခါနီး (Critical)</h3>
                <div style={{marginTop: '10px'}}>
                  {products.filter(p => p.stock_quantity < 5).map(p => (
                    <div key={p.id} style={{background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '5px', marginBottom: '5px'}}>
                      {p.name} - (ကျန်: {p.stock_quantity})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const navBtnStyle = { background: 'transparent', border: 'none', color: '#94a3b8', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const activeNavStyle = { ...navBtnStyle, background: '#1e293b', color: 'white' };
const catStyle = { padding: '8px 20px', borderRadius: '20px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', whiteSpace: 'nowrap' };
const activeCatStyle = { ...catStyle, background: '#2563eb', color: 'white', border: 'none' };
const searchInputStyle = { width: '100%', padding: '10px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' };
const productCardStyle = (stock) => ({ background: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', cursor: stock > 0 ? 'pointer' : 'not-allowed', opacity: stock > 0 ? 1 : 0.6, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' });
const cartContainerStyle = { width: '380px', background: 'white', padding: '20px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' };
const cartItemStyle = { padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px' };
const discountInputStyle = { width: '90px', padding: '5px', textAlign: 'right', borderRadius: '5px', border: '1px solid #cbd5e1' };
const checkoutBtnStyle = { width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' };
const orderHistoryCard = { background: 'white', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' };
const printMiniBtn = { marginTop: '5px', background: 'none', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' };
const statCard = (color) => ({ background: color, color: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' });
