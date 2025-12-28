import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, RefreshCw, Trash2, CreditCard, LayoutDashboard, Store, Search } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos'); // 'pos' or 'dashboard'
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [salesSummary, setSalesSummary] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchSalesToday();
    const channel = supabase.channel('realtime-pos').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'products' }, () => fetchProducts()).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // 1. စာရင်းသွင်းခြင်း
    const total = cart.reduce((acc, curr) => acc + curr.price, 0);
    const { error } = await supabase.from('orders').insert([{ total_amount: total }]);
    
    if (!error) {
      // 2. စတော့နှုတ်ခြင်း (တစ်ခုချင်းစီ)
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: 1 });
      }
      alert("ရောင်းချမှု အောင်မြင်ပါသည်။ စတော့နှုတ်ပြီးပါပြီ။");
      setCart([]);
      fetchSalesToday();
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Navigation Bar */}
      <div style={{ background: '#1e293b', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>My POS Pro 🚀</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setView('pos')} style={navBtnStyle}><Store size={20}/> POS</button>
          <button onClick={() => setView('dashboard')} style={navBtnStyle}><LayoutDashboard size={20}/> Dashboard</button>
        </div>
      </div>

      {view === 'pos' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Product Area */}
          <div style={{ flex: 1, padding: '20px', background: '#f1f5f9', overflowY: 'auto' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} size={20}/>
                <input 
                  type="text" 
                  placeholder="ပစ္စည်းရှာရန်..." 
                  style={{ width: '100%', padding: '10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button onClick={fetchProducts} style={{ padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><RefreshCw/></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart(p)} style={productCardStyle(p.stock_quantity)}>
                  <div style={{ fontSize: '40px' }}>{p.stock_quantity <= 0 ? '❌' : '📦'}</div>
                  <b style={{ display: 'block', margin: '10px 0' }}>{p.name}</b>
                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{p.price.toLocaleString()} MMK</span>
                  <div style={{ fontSize: '12px', marginTop: '10px', color: p.stock_quantity < 5 ? 'red' : '#64748b' }}>
                    Stock: {p.stock_quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Area */}
          <div style={{ width: '400px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <h3><ShoppingCart/> လက်ရှိပြေစာ</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={cartItemStyle}>
                  <span>{item.name}</span>
                  <span>{item.price.toLocaleString()} <Trash2 size={16} color="red" onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{cursor:'pointer'}}/></span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                <span>Total:</span>
                <span style={{ color: '#2563eb' }}>{cart.reduce((a,b)=>a+b.price, 0).toLocaleString()} MMK</span>
              </div>
              <button onClick={handleCheckout} style={checkoutBtnStyle}>Pay Now & Update Stock</button>
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard View */
        <div style={{ padding: '40px', background: '#f8fafc', flex: 1 }}>
          <h1>ယနေ့ရောင်းရငွေ အနှစ်ချုပ်</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div style={statCardStyle}>
              <h3>ယနေ့စုစုပေါင်း (Daily Sales)</h3>
              <p style={{ fontSize: '35px', color: '#16a34a', fontWeight: 'bold' }}>{salesSummary.toLocaleString()} MMK</p>
            </div>
            <div style={statCardStyle}>
              <h3>စတော့နည်းနေသော ပစ္စည်းများ</h3>
              {products.filter(p => p.stock_quantity < 5).map(p => (
                <div key={p.id} style={{ color: 'red' }}>⚠️ {p.name} - (ကျန်: {p.stock_quantity})</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = { background: 'none', border: '1px solid #475569', color: 'white', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const productCardStyle = (stock) => ({ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', cursor: stock > 0 ? 'pointer' : 'not-allowed', opacity: stock > 0 ? 1 : 0.5, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' });
const cartItemStyle = { display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '10px' };
const checkoutBtnStyle = { width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' };
const statCardStyle = { background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
