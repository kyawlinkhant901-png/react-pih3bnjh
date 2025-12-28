import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Search, Trash2, Edit3, Save, Package, AlertTriangle, Plus, Check, X, Wifi, WifiOff, CloudUpload } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineOrders, setOfflineOrders] = useState(JSON.parse(localStorage.getItem('offline_orders')) || []);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, cost_price: 0, stock_quantity: 0, product_code: '' });

  useEffect(() => {
    fetchData();
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [isOnline]);

  async function fetchData() {
    if (isOnline) {
      const { data: p } = await supabase.from('products').select('*').order('name');
      const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setProducts(p || []);
      setOrders(o || []);
      localStorage.setItem('products_cache', JSON.stringify(p || []));
    } else {
      setProducts(JSON.parse(localStorage.getItem('products_cache')) || []);
    }
  }

  const syncOffline = async () => {
    if (!isOnline || offlineOrders.length === 0) return;
    const { error } = await supabase.from('orders').insert(offlineOrders);
    if (!error) {
      setOfflineOrders([]);
      localStorage.removeItem('offline_orders');
      fetchData();
      alert("Offline စာရင်းများ သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const summary = cart.map(i => `${i.name} x${i.qty}`).join(', ');
    const orderData = { total_amount: total, device_name: summary, created_at: new Date() };

    if (isOnline) {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (!error) {
        for (const item of cart) {
          await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
        }
        alert("အရောင်းအောင်မြင်ပြီး စတော့လျော့လိုက်ပါပြီ။");
      }
    } else {
      const updatedOffline = [...offlineOrders, orderData];
      setOfflineOrders(updatedOffline);
      localStorage.setItem('offline_orders', JSON.stringify(updatedOffline));
      alert("Offline အဖြစ် သိမ်းဆည်းထားပါသည်။ အင်တာနက်ရလျှင် Sync လုပ်ပါ။");
    }
    setCart([]); fetchData();
  };

  const deleteOrder = async (id) => {
    if (window.confirm("ဤဘောင်ချာကို ဖျက်မှာ သေချာပါသလား?")) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm("ဤပစ္စည်းကို အပြီးဖျက်မှာ သေਚာပါသလား?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  };

  const addToCart = (p) => {
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...p, qty: 1 }]);
    }
  };

  const filteredProducts = products.filter(p => p.name.includes(search) || (p.product_code && p.product_code.includes(search)));

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f8fafc' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', background: '#1e293b', color: '#fff', padding: '20px' }}>
        <h2 style={{ color: '#38bdf8' }}>My POS Pro</h2>
        <div style={{ margin: '10px 0', fontSize: '13px', color: isOnline ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isOnline ? <Wifi size={16}/> : <WifiOff size={16}/>} {isOnline ? 'Online' : 'Offline Mode'}
          {offlineOrders.length > 0 && isOnline && <CloudUpload size={18} onClick={syncOffline} style={{cursor:'pointer', color:'#fbbf24'}}/>}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setView('pos')} style={navBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('inventory')} style={navBtn(view==='inventory')}><Package size={18}/> ပစ္စည်းစီမံခြင်း</button>
          <button onClick={() => setView('history')} style={navBtn(view==='history')}><LayoutDashboard size={18}/> စာရင်းများ/Report</button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <input placeholder="ရှာဖွေရန်..." style={searchInput} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} style={cardStyle}>
                    {p.stock_quantity <= 5 && <AlertTriangle size={14} color="red" style={{float:'right'}}/>}
                    <div style={{fontWeight:'bold'}}>{p.name}</div>
                    <div style={{color:'#2563eb'}}>{p.price} K</div>
                    <small style={{color: p.stock_quantity <= 5 ? 'red' : '#666'}}>Stock: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartPanel}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              <div style={{flex:1}}>{cart.map((c,i)=><div key={i} style={cartItem}>{c.name} x{c.qty} <b>{c.price * c.qty} K</b></div>)}</div>
              <div style={{borderTop:'2px solid #eee', paddingTop:'10px'}}>
                <h4>Total: {cart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString()} K</h4>
                <button onClick={handleCheckout} style={btnPrimary}>Pay Now</button>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div style={tableCard}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
              <h3>📦 ပစ္စည်းစာရင်း</h3>
              <button onClick={() => setShowAddProduct(!showAddProduct)} style={{padding:'8px', background:'#10b981', color:'#fff', border:'none', borderRadius:'5px'}}><Plus size={16}/> အသစ်ထည့်</button>
            </div>
            {showAddProduct && (
              <div style={{background:'#f1f5f9', padding:'15px', borderRadius:'10px', marginBottom:'15px'}}>
                <input placeholder="အမည်" onChange={e=>setNewProduct({...newProduct, name:e.target.value})} style={inputStyle}/>
                <input placeholder="ရောင်းစျေး" type="number" onChange={e=>setNewProduct({...newProduct, price:Number(e.target.value)})} style={inputStyle}/>
                <input placeholder="စတော့" type="number" onChange={e=>setNewProduct({...newProduct, stock_quantity:Number(e.target.value)})} style={inputStyle}/>
                <button onClick={async ()=>{await supabase.from('products').insert([newProduct]); setShowAddProduct(false); fetchData();}} style={btnPrimary}>သိမ်းမည်</button>
              </div>
            )}
            <table style={{width:'100%', textAlign:'left'}}>
              <thead><tr style={{borderBottom:'2px solid #ddd'}}><th>အမည်</th><th>စျေးနှုန်း</th><th>စတော့</th><th>Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:'10px'}}>{p.name}</td>
                    <td>{p.price} K</td>
                    <td style={{color: p.stock_quantity <= 5 ? 'red' : 'black'}}>{p.stock_quantity}</td>
                    <td><Trash2 size={16} color="red" onClick={()=>deleteProduct(p.id)} style={{cursor:'pointer'}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'history' && (
          <div style={tableCard}>
            <h3>🗓 အရောင်းစာရင်းများနှင့် Report</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'20px'}}>
              <div style={{background:'#2563eb', color:'#fff', padding:'20px', borderRadius:'10px'}}>
                <h4>စုစုပေါင်းရောင်းရငွေ</h4>
                <h2>{orders.reduce((a,b)=>a+Number(b.total_amount),0).toLocaleString()} K</h2>
              </div>
              <div style={{background:'#10b981', color:'#fff', padding:'20px', borderRadius:'10px'}}>
                <h4>ခန့်မှန်းခြေ အမြတ်</h4>
                <h2>{(orders.reduce((a,b)=>a+Number(b.total_amount),0) * 0.2).toLocaleString()} K</h2>
              </div>
            </div>
            {orders.map(o => (
              <div key={o.id} style={{display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid #eee'}}>
                <div><b>{new Date(o.created_at).toLocaleDateString()}</b><br/><small>{o.device_name}</small></div>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}><b>{o.total_amount} K</b> <Trash2 size={16} color="red" onClick={()=>deleteOrder(o.id)} style={{cursor:'pointer'}}/></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = (sel) => ({ width: '100%', padding: '12px', textAlign: 'left', background: sel ? '#38bdf8' : 'none', border: 'none', color: sel ? '#0f172a' : '#94a3b8', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' });
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' };
const cartPanel = { width: '320px', background: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column' };
const cartItem = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize:'14px' };
const searchInput = { width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const btnPrimary = { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '5px', border: '1px solid #ddd' };
const tableCard = { background: '#fff', padding: '20px', borderRadius: '15px' };
