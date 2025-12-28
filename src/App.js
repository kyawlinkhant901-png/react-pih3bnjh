import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Search, Trash2, Edit3, Save, Package, AlertTriangle, Plus, Check, X } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, cost_price: 0, stock_quantity: 0, product_code: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
  }

  // --- ပစ္စည်း စီမံခန့်ခွဲမှု (Add / Edit / Delete) ---
  const handleAddProduct = async () => {
    const { error } = await supabase.from('products').insert([newProduct]);
    if (!error) { setShowAddProduct(false); setNewProduct({ name: '', price: 0, cost_price: 0, stock_quantity: 0, product_code: '' }); fetchData(); }
  };

  const deleteProduct = async (id) => {
    if (window.confirm("ဤပစ္စည်းကို အပြီးဖျက်မည်မှာ သေချာပါသလား?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  };

  // --- အရောင်းမှတ်တမ်း (Edit / Delete) ---
  const deleteOrder = async (id) => {
    if (window.confirm("ဤအရောင်းဘောင်ချာကို ဖျက်မည်မှာ သေချာပါသလား? စတော့ပြန်တိုးမည်မဟုတ်ပါ။")) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  // --- အရောင်း (POS) စနစ် ---
  const addToCart = (p) => {
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      setCart(cart.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...p, qty: 1 }]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const summary = cart.map(i => `${i.name} (Qty: ${i.qty}, Total: ${i.price * i.qty} K)`).join(', ');

    const { error } = await supabase.from('orders').insert([{ total_amount: total, device_name: summary }]);
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      }
      alert("ရောင်းချမှု အောင်မြင်သည်။ စတော့ လျော့လိုက်ပါပြီ။");
      setCart([]); fetchData();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f8fafc' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', background: '#1e293b', color: '#fff', padding: '20px' }}>
        <h2 style={{ color: '#38bdf8' }}>Smart POS</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px' }}>
          <button onClick={() => setView('pos')} style={navBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('inventory')} style={navBtn(view==='inventory')}><Package size={18}/> ပစ္စည်း/စတော့ စီမံခြင်း</button>
          <button onClick={() => setView('history')} style={navBtn(view==='history')}><Calendar size={18}/> အရောင်းမှတ်တမ်း</button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <input placeholder="ရှာဖွေရန်..." style={searchInput} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                {products.filter(p => p.name.includes(search)).map(p => (
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
              <div style={{flex:1}}>
                {cart.map((c,i)=>(
                  <div key={i} style={cartItem}>
                    <div>{c.name} <br/> <small>{c.price} x {c.qty}</small></div>
                    <b>{c.price * c.qty} K</b>
                  </div>
                ))}
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
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
               <h3>📦 ပစ္စည်းစာရင်း</h3>
               <button onClick={() => setShowAddProduct(true)} style={btnSmall}><Plus size={16}/> အသစ်ထည့်ရန်</button>
            </div>

            {showAddProduct && (
              <div style={modalStyle}>
                <input placeholder="ပစ္စည်းအမည်" onChange={e=>setNewProduct({...newProduct, name:e.target.value})} style={inputStyle}/>
                <input placeholder="Code" onChange={e=>setNewProduct({...newProduct, product_code:e.target.value})} style={inputStyle}/>
                <input placeholder="ရောင်းစျေး" type="number" onChange={e=>setNewProduct({...newProduct, price:Number(e.target.value)})} style={inputStyle}/>
                <input placeholder="စတော့အရေအတွက်" type="number" onChange={e=>setNewProduct({...newProduct, stock_quantity:Number(e.target.value)})} style={inputStyle}/>
                <button onClick={handleAddProduct} style={btnPrimary}>သိမ်းမည်</button>
                <button onClick={()=>setShowAddProduct(false)} style={{...btnPrimary, background:'#64748b', marginTop:'5px'}}>ပယ်ဖျက်မည်</button>
              </div>
            )}

            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'2px solid #ddd', textAlign:'left'}}><th>အမည်</th><th>စျေးနှုန်း</th><th>စတော့</th><th>Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:'10px'}}>{p.name}</td>
                    <td>{p.price} K</td>
                    <td style={{color: p.stock_quantity <= 5 ? 'red' : 'black'}}>{p.stock_quantity}</td>
                    <td>
                      <Trash2 size={18} color="red" onClick={() => deleteProduct(p.id)} style={{cursor:'pointer'}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'history' && (
          <div style={tableCard}>
            <h3>🗓 အရောင်းမှတ်တမ်း (Edit/Delete)</h3>
            {orders.map(o => (
              <div key={o.id} style={historyItem}>
                <div>
                  <b>{new Date(o.created_at).toLocaleString()}</b><br/>
                  <small>{o.device_name}</small>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                  <b style={{color:'#2563eb'}}>{o.total_amount} K</b>
                  <Trash2 size={18} color="red" onClick={() => deleteOrder(o.id)} style={{cursor:'pointer'}}/>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// Styles (သပ်ရပ်လှပစေရန်)
const navBtn = (sel) => ({ width: '100%', padding: '12px', textAlign: 'left', background: sel ? '#38bdf8' : 'none', border: 'none', color: sel ? '#0f172a' : '#94a3b8', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: sel ? 'bold' : 'normal' });
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', border: '1px solid #e2e8f0' };
const cartPanel = { width: '350px', background: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const cartItem = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' };
const searchInput = { width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' };
const btnPrimary = { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const btnSmall = { padding: '8px 15px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };
const tableCard = { background: '#fff', padding: '20px', borderRadius: '15px' };
const modalStyle = { background: '#f1f5f9', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #cbd5e1' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' };
const historyItem = { display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #f1f5f9' };
