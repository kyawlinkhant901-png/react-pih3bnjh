import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Store, Package, LayoutDashboard, Search, Trash2, Edit3, Plus, Wifi, WifiOff, CloudUpload, AlertTriangle, Save, X } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos'); // pos, inventory, history
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineOrders, setOfflineOrders] = useState(JSON.parse(localStorage.getItem('offline_orders')) || []);
  
  // Forms
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: 0, cost_price: 0, stock_quantity: 0, product_code: '' });

  useEffect(() => {
    fetchData();
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
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

  // --- POS Logic ---
  const addToCart = (p) => {
    const existing = cart.find(i => i.id === p.id);
    setCart(existing ? cart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...cart, { ...p, qty: 1 }]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const costTotal = cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);
    const summary = cart.map(i => `${i.name} x${i.qty} (${i.price * i.qty}K)`).join(', ');
    
    const orderData = { total_amount: total, device_name: summary, profit: total - costTotal, created_at: new Date() };

    if (isOnline) {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (!error) {
        for (const item of cart) await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
        alert("အရောင်းအောင်မြင်သည်။");
      }
    } else {
      const updatedOffline = [...offlineOrders, orderData];
      setOfflineOrders(updatedOffline);
      localStorage.setItem('offline_orders', JSON.stringify(updatedOffline));
      alert("Offline သိမ်းလိုက်ပါပြီ။");
    }
    setCart([]); fetchData();
  };

  // --- Inventory Logic ---
  const saveProduct = async () => {
    const action = editingProduct ? supabase.from('products').update(productForm).eq('id', editingProduct.id) : supabase.from('products').insert([productForm]);
    const { error } = await action;
    if (!error) { setShowAddProduct(false); setEditingProduct(null); fetchData(); }
  };

  const updateStock = async (p_id, qty) => {
    const { error } = await supabase.rpc('handle_purchase', { p_id: p_id, quantity_to_add: parseInt(qty) });
    if (!error) { alert("စတော့တိုးပြီးပါပြီ"); fetchData(); }
  };

  // --- Render Functions ---
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.product_code && p.product_code.includes(search)));

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <h2>My POS Pro</h2>
        <div style={{ fontSize: '12px', color: isOnline ? '#4ade80' : '#f87171', marginBottom: '20px' }}>
          {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>} {isOnline ? 'Online' : 'Offline'}
        </div>
        <button onClick={() => setView('pos')} style={navBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
        <button onClick={() => setView('inventory')} style={navBtn(view==='inventory')}><Package size={18}/> ပစ္စည်း/စတော့</button>
        <button onClick={() => setView('history')} style={navBtn(view==='history')}><LayoutDashboard size={18}/> လချုပ်/မှတ်တမ်း</button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <input placeholder="Code သို့မဟုတ် အမည်ဖြင့်ရှာပါ..." style={inputStyle} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} style={cardStyle}>
                    {p.stock_quantity <= 5 && <AlertTriangle size={16} color="red" style={{float:'right'}}/>}
                    <b>{p.name}</b><br/>
                    <small>#{p.product_code || 'No Code'}</small>
                    <div style={{color:'#2563eb', fontWeight:'bold'}}>{p.price} K</div>
                    <div style={{fontSize:'12px', color: p.stock_quantity <= 5 ? 'red' : '#666'}}>Stock: {p.stock_quantity}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartPanel}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              <div style={{flex:1}}>{cart.map((c,i)=><div key={i} style={cartItem}>{c.name} x{c.qty} <span style={{float:'right'}}>{c.price * c.qty} K</span></div>)}</div>
              <div style={{borderTop:'2px solid #eee', paddingTop:'10px'}}>
                <h3>Total: {cart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString()} K</h3>
                <button onClick={handleCheckout} style={btnPrimary}>Pay Now</button>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div style={contentCard}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h3>📦 ပစ္စည်းစီမံခန့်ခွဲမှု</h3>
              <button onClick={() => {setEditingProduct(null); setProductForm({name:'', price:0, cost_price:0, stock_quantity:0, product_code:''}); setShowAddProduct(true)}} style={btnSuccess}>+ ပစ္စည်းအသစ်</button>
            </div>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead style={{background:'#f8fafc'}}><tr><th>Code</th><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>စတော့</th><th>Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:'10px'}}>{p.product_code || '-'}</td>
                    <td>{p.name}</td><td>{p.price} K</td><td>{p.cost_price} K</td>
                    <td style={{color: p.stock_quantity <= 5 ? 'red' : 'black'}}>{p.stock_quantity}</td>
                    <td>
                      <Edit3 size={16} onClick={()=>{setEditingProduct(p); setProductForm(p); setShowAddProduct(true)}} style={{cursor:'pointer', marginRight:'10px'}}/>
                      <Plus size={16} onClick={()=>{const q = prompt("ဝယ်ယူသည့်အရေအတွက်?"); if(q) updateStock(p.id, q)}} style={{cursor:'pointer', color:'green', marginRight:'10px'}}/>
                      <Trash2 size={16} onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('products').delete().eq('id',p.id); fetchData()}}} style={{cursor:'pointer', color:'red'}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'history' && (
          <div style={contentCard}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px', marginBottom:'20px'}}>
              <div style={{background:'#2563eb', color:'#fff', padding:'20px', borderRadius:'10px'}}><h4>ဒီလရောင်းရငွေ</h4><h2>{orders.reduce((a,b)=>a+Number(b.total_amount),0).toLocaleString()} K</h2></div>
              <div style={{background:'#10b981', color:'#fff', padding:'20px', borderRadius:'10px'}}><h4>ဒီလအမြတ်</h4><h2>{orders.reduce((a,b)=>a+Number(b.profit || 0),0).toLocaleString()} K</h2></div>
              <div style={{background:'#f59e0b', color:'#fff', padding:'20px', borderRadius:'10px'}}><h4>ဘောင်ချာစုစုပေါင်း</h4><h2>{orders.length} စောင်</h2></div>
            </div>
            {orders.map(o => (
              <div key={o.id} style={{display:'flex', justifyContent:'space-between', padding:'15px', borderBottom:'1px solid #eee'}}>
                <div><b>{new Date(o.created_at).toLocaleString()}</b><br/><small>{o.device_name}</small></div>
                <div><b style={{color:'#2563eb'}}>{o.total_amount} K</b> <Trash2 size={16} color="red" onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('orders').delete().eq('id',o.id); fetchData()}}} style={{cursor:'pointer', marginLeft:'15px'}}/></div>
              </div>
            ))}
          </div>
        )}

        {showAddProduct && (
          <div style={modalOverlay}>
            <div style={modalContent}>
              <h3>{editingProduct ? 'ပစ္စည်းပြင်ဆင်ရန်' : 'ပစ္စည်းအသစ်ထည့်ရန်'}</h3>
              <input placeholder="ပစ္စည်းအမည်" style={inputStyle} value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})}/>
              <input placeholder="Product Code" style={inputStyle} value={productForm.product_code} onChange={e=>setProductForm({...productForm, product_code:e.target.value})}/>
              <input placeholder="ရောင်းစျေး" type="number" style={inputStyle} value={productForm.price} onChange={e=>setProductForm({...productForm, price:Number(e.target.value)})}/>
              <input placeholder="ရင်းစျေး" type="number" style={inputStyle} value={productForm.cost_price} onChange={e=>setProductForm({...productForm, cost_price:Number(e.target.value)})}/>
              <input placeholder="စတော့အရေအတွက်" type="number" style={inputStyle} value={productForm.stock_quantity} onChange={e=>setProductForm({...productForm, stock_quantity:Number(e.target.value)})}/>
              <button onClick={saveProduct} style={btnPrimary}>သိမ်းဆည်းမည်</button>
              <button onClick={()=>setShowAddProduct(false)} style={{...btnPrimary, background:'#64748b', marginTop:'10px'}}>ပိတ်မည်</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const navBtn = (sel) => ({ width: '100%', padding: '12px', textAlign: 'left', background: sel ? '#38bdf8' : 'none', border: 'none', color: sel ? '#0f172a' : '#94a3b8', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' });
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const cartPanel = { width: '350px', background: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column' };
const cartItem = { padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const btnPrimary = { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const btnSuccess = { padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const contentCard = { background: '#fff', padding: '20px', borderRadius: '15px' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const modalContent = { background: '#fff', padding: '30px', borderRadius: '15px', width: '400px' };
