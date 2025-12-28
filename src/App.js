import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Search, Trash2, Calendar, Package, Save, Edit3, Check, Wifi, WifiOff, CloudUpload, TrendingUp, XCircle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineOrders, setOfflineOrders] = useState(JSON.parse(localStorage.getItem('offline_orders')) || []);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ product_code: '', name: '', price: 0, cost_price: 0, stock_quantity: 0 });
  const [purchaseForm, setPurchaseForm] = useState({ productId: '', qty: 1, cost: 0 });

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
      localStorage.setItem('products_cache', JSON.stringify(p));
    } else {
      setProducts(JSON.parse(localStorage.getItem('products_cache')) || []);
    }
  }

  // --- Offline Sync ---
  const syncOfflineData = async () => {
    if (!isOnline || offlineOrders.length === 0) return;
    const { error } = await supabase.from('orders').insert(offlineOrders);
    if (!error) {
      setOfflineOrders([]);
      localStorage.removeItem('offline_orders');
      fetchData();
      alert("Offline စာရင်းများ Online သို့ ပို့ပြီးပါပြီ။");
    }
  };

  // --- Product Management (Edit/Delete) ---
  const saveProduct = async (id) => {
    const { error } = await supabase.from('products').update(editForm).eq('id', id);
    if (!error) { setEditingId(null); fetchData(); }
  };

  const deleteProduct = async (id) => {
    if (window.confirm("ဒီပစ္စည်းကို အပြီးဖျက်မှာ သေချာပါသလား?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  };

  // --- Sales (POS) ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const orderData = { 
      total_amount: total, 
      device_name: cart.map(i => `${i.name} x${i.qty}`).join(', '),
      items_json: cart,
      created_at: new Date()
    };

    if (isOnline) {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (!error) {
        for (const item of cart) {
          await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
        }
        if (window.confirm("ရောင်းချမှုအောင်မြင်သည်။ Print ထုတ်မလား?")) window.print();
      }
    } else {
      const newOffline = [...offlineOrders, orderData];
      setOfflineOrders(newOffline);
      localStorage.setItem('offline_orders', JSON.stringify(newOffline));
      alert("Offline အနေဖြင့် သိမ်းဆည်းလိုက်ပါပြီ။");
    }
    setCart([]); fetchData();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
  );

  // --- Reports Calculation ---
  const today = new Date().toLocaleDateString();
  const dailyTotal = orders.filter(o => new Date(o.created_at).toLocaleDateString() === today)
                           .reduce((a, b) => a + Number(b.total_amount), 0);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <div className="no-print" style={sidebarStyle}>
        <h2 style={{ color: '#38bdf8', marginBottom: '10px' }}>Smart POS Pro</h2>
        <div style={{ marginBottom: '20px', color: isOnline ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          {isOnline ? <Wifi size={16}/> : <WifiOff size={16}/>} {isOnline ? 'Online' : 'Offline'}
          {offlineOrders.length > 0 && isOnline && <CloudUpload size={18} onClick={syncOfflineData} style={{cursor:'pointer', color:'#fbbf24'}}/>}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setView('pos')} style={navBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('inventory')} style={navBtn(view==='inventory')}><Package size={18}/> ပစ္စည်းစီမံခြင်း</button>
          <button onClick={() => setView('purchase')} style={navBtn(view==='purchase')}><PlusCircle size={18}/> အဝယ်ဘောင်ချာ</button>
          <button onClick={() => setView('report')} style={navBtn(view==='report')}><TrendingUp size={18}/> အရောင်း Report</button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="no-print" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <input placeholder="နာမည် သို့မဟုတ် Code ဖြင့်ရှာပါ..." style={searchInput} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => setCart([...cart, { ...p, qty: 1 }])} style={cardStyle}>
                    <small>#{p.product_code || 'No Code'}</small>
                    <div style={{fontWeight:'bold', fontSize:'14px', margin:'5px 0'}}>{p.name}</div>
                    <div style={{color:'#2563eb'}}>{p.price} K</div>
                    <div style={{fontSize:'11px'}}>Qty: {p.stock_quantity}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartPanel}>
              <h3>🛒 ဘောင်ချာ</h3>
              <div style={{flex:1, overflowY:'auto'}}>
                {cart.map((c,i)=><div key={i} style={cartItem}>{c.name} x{c.qty} <Trash2 size={14} onClick={()=>setCart(cart.filter((_,idx)=>idx!==i))} style={{cursor:'pointer', color:'red'}}/></div>)}
              </div>
              <div style={{borderTop:'2px solid #eee', paddingTop:'10px'}}>
                <h4>Total: {cart.reduce((a,b)=>a+(b.price*b.qty),0).toLocaleString()} K</h4>
                <button onClick={handleCheckout} style={btnPrimary}>Check Out</button>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div style={tableCard}>
            <h3>📦 ပစ္စည်းများ ပြင်ဆင်ခြင်း/ဖျက်ခြင်း</h3>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead><tr style={{textAlign:'left', borderBottom:'2px solid #ddd'}}><th>Code</th><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>စတော့</th><th>Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                    {editingId === p.id ? (
                      <>
                        <td><input style={smallInput} value={editForm.product_code} onChange={e=>setEditForm({...editForm, product_code:e.target.value})}/></td>
                        <td><input style={smallInput} value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})}/></td>
                        <td><input style={smallInput} type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price:Number(e.target.value)})}/></td>
                        <td><input style={smallInput} type="number" value={editForm.cost_price} onChange={e=>setEditForm({...editForm, cost_price:Number(e.target.value)})}/></td>
                        <td><input style={smallInput} type="number" value={editForm.stock_quantity} onChange={e=>setEditForm({...editForm, stock_quantity:Number(e.target.value)})}/></td>
                        <td><Check size={18} onClick={()=>saveProduct(p.id)} style={{cursor:'pointer', color:'green'}}/></td>
                      </>
                    ) : (
                      <>
                        <td style={{padding:'10px'}}>{p.product_code || '-'}</td>
                        <td>{p.name}</td>
                        <td>{p.price} K</td>
                        <td>{p.cost_price} K</td>
                        <td>{p.stock_quantity}</td>
                        <td style={{display:'flex', gap:'10px', padding:'10px'}}>
                          <Edit3 size={16} onClick={() => {setEditingId(p.id); setEditForm(p);}} style={{cursor:'pointer', color:'#2563eb'}}/>
                          <Trash2 size={16} onClick={() => deleteProduct(p.id)} style={{cursor:'pointer', color:'red'}}/>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'purchase' && (
          <div style={formBox}>
            <h3>🛒 အဝယ်ဘောင်ချာ (စတော့တိုးရန်)</h3>
            <select style={inputStyle} onChange={e => setPurchaseForm({...purchaseForm, productId: e.target.value})}>
              <option value="">-- ပစ္စည်းရွေးပါ --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="အရေအတွက် (Qty)" type="number" style={inputStyle} onChange={e => setPurchaseForm({...purchaseForm, qty: e.target.value})} />
            <button onClick={async () => {
              await supabase.rpc('handle_purchase', { p_id: purchaseForm.productId, quantity_to_add: parseInt(purchaseForm.qty) });
              alert("စတော့တိုးပြီးပါပြီ"); fetchData();
            }} style={btnPrimary}>စတော့ပေါင်းထည့်မည်</button>
          </div>
        )}

        {view === 'report' && (
          <div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
              <div style={{...statCard, background:'#2563eb'}}><h4>ယနေ့ရောင်းအား</h4><h2>{dailyTotal.toLocaleString()} K</h2></div>
              <div style={{...statCard, background:'#10b981'}}><h4>ခန့်မှန်းခြေအမြတ် (ဒီလ)</h4><h2>{(dailyTotal * 0.25).toLocaleString()} K</h2></div>
            </div>
            <div style={{marginTop:'20px', background:'#fff', padding:'20px', borderRadius:'15px'}}>
              <h3>အရောင်းစာရင်းများ</h3>
              {orders.map(o => (
                <div key={o.id} style={{padding:'10px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}>
                  <span>{new Date(o.created_at).toLocaleDateString()} - {o.device_name}</span>
                  <b>{o.total_amount} K</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@media print {.no-print {display:none;} .print-only {display:block !important;}} .print-only {display:none; font-family:monospace; padding:20px;}`}</style>
      <div className="print-only">
        <center><h2>RECEIPT</h2><hr/>{cart.map((c,i)=><div key={i}>{c.name} x{c.qty} .. {c.price*c.qty}</div>)}<hr/><h3>Total: {cart.reduce((a,b)=>a+(b.price*b.qty),0)}</h3></center>
      </div>
    </div>
  );
}

// Styles
const sidebarStyle = { width: '260px', background: '#0f172a', color: '#fff', padding: '20px' };
const navBtn = (sel) => ({ width: '100%', padding: '12px', textAlign: 'left', background: sel ? '#1e293b' : 'none', border: 'none', color: sel ? '#38bdf8' : '#94a3b8', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' });
const cardStyle = { background: '#fff', padding: '12px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign:'center', border:'1px solid #e2e8f0' };
const cartPanel = { width: '320px', background: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' };
const cartItem = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize:'13px' };
const searchInput = { width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' };
const smallInput = { width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid #38bdf8' };
const btnPrimary = { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const tableCard = { background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' };
const formBox = { maxWidth: '400px', background: '#fff', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0' };
const statCard = { padding: '25px', borderRadius: '15px', color: '#fff' };
