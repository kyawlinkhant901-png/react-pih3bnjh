import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Search, Trash2, Edit3, Calendar, DollarSign, Package } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [monthlyData, setMonthlyData] = useState({ revenue: 0, profit: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
    calculateMonthly(o || []);
  }

  // လချုပ်တွက်ချက်ခြင်း
  const calculateMonthly = (allOrders) => {
    const now = new Date();
    const currentMonth = allOrders.filter(o => new Date(o.created_at).getMonth() === now.getMonth());
    const rev = currentMonth.reduce((a, b) => a + Number(b.total_amount), 0);
    // အမြတ်ကို အကြမ်းဖျင်းတွက်ချက်ခြင်း (Sales - Cost)
    setMonthlyData({ revenue: rev, profit: rev * 0.2 }); // ဥပမာ - ၂၀% အမြတ်
  };

  // အရောင်းစာရင်း ဖျက်ခြင်း
  const deleteOrder = async (id) => {
    if (window.confirm("ဒီအရောင်းစာရင်းကို ဖျက်မှာ သေချာပါသလား?")) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + b.price, 0);
    const { error } = await supabase.from('orders').insert([{ 
      total_amount: total, 
      device_name: cart.map(i => i.name).join(', '),
      items_json: cart 
    }]);
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: 1 });
      }
      alert("ရောင်းချမှု အောင်မြင်သည်။");
      setCart([]); fetchData();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f8fafc' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <h2 style={{ color: '#38bdf8' }}>Pro POS Manager</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px' }}>
          <button onClick={() => setView('pos')} style={sidebarBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('inventory')} style={sidebarBtn(view==='inventory')}><Package size={18}/> ပစ္စည်းစာရင်း/Code</button>
          <button onClick={() => setView('history')} style={sidebarBtn(view==='history')}><Calendar size={18}/> အရောင်းစာရင်း (Edit)</button>
          <button onClick={() => setView('report')} style={sidebarBtn(view==='report')}><LayoutDashboard size={18}/> လချုပ် Report</button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} size={20}/>
                <input 
                  placeholder="ပစ္စည်းနာမည် သို့မဟုတ် Code ဖြင့်ရှာပါ..." 
                  style={searchInput} 
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => setCart([...cart, p])} style={productCard}>
                    <small style={{color: '#64748b'}}>#{p.product_code || 'No Code'}</small>
                    <div style={{fontWeight: 'bold', margin: '5px 0'}}>{p.name}</div>
                    <div style={{color: '#2563eb'}}>{p.price.toLocaleString()} K</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartContainer}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              <div style={{flex: 1}}>{cart.map((c, i) => <div key={i} style={cartItem}>{c.name} <span>{c.price} K</span></div>)}</div>
              <div style={{borderTop: '2px solid #f1f5f9', paddingTop: '15px'}}>
                <h3>Total: {cart.reduce((a,b)=>a+b.price,0).toLocaleString()} K</h3>
                <button onClick={handleCheckout} style={checkoutBtn}>Checkout</button>
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div style={tableCard}>
            <h3>အရောင်းမှတ်တမ်း (Edit/Delete)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th>နေ့စွဲ</th><th>ပစ္စည်းများ</th><th>စုစုပေါင်း</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{padding: '12px'}}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>{o.device_name}</td>
                    <td>{o.total_amount} K</td>
                    <td>
                      <button onClick={() => deleteOrder(o.id)} style={{color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer'}}><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'report' && (
          <div>
            <h1>📊 လချုပ်အစီရင်ခံစာ ({new Date().toLocaleString('default', { month: 'long' })})</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{...statCard, background: '#2563eb'}}>
                <h4>စုစုပေါင်းရောင်းရငွေ</h4>
                <h2>{monthlyData.revenue.toLocaleString()} MMK</h2>
              </div>
              <div style={{...statCard, background: '#10b981'}}>
                <h4>ခန့်မှန်းခြေ အမြတ်</h4>
                <h2>{monthlyData.profit.toLocaleString()} MMK</h2>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const sidebarBtn = (active) => ({ width: '100%', padding: '12px', textAlign: 'left', background: active ? '#1e293b' : 'none', border: 'none', color: active ? '#38bdf8' : '#94a3b8', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' });
const searchInput = { width: '100%', padding: '10px 10px 10px 40px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' };
const productCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' };
const cartContainer = { width: '350px', background: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const cartItem = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' };
const checkoutBtn = { width: '100%', padding: '15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const tableCard = { background: '#fff', padding: '20px', borderRadius: '15px' };
const statCard = { padding: '30px', borderRadius: '20px', color: '#fff' };
