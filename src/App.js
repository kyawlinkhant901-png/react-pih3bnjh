import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Search, Trash2, Calendar, Package, Save, Edit3, Check } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ product_code: '', name: '', price: 0, cost_price: 0 });
  const [purchaseForm, setPurchaseForm] = useState({ productId: '', qty: 1 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
  }

  // ပစ္စည်းအချက်အလက်ပြင်ဆင်ရန် (Code ထည့်ရန်)
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ product_code: p.product_code || '', name: p.name, price: p.price, cost_price: p.cost_price || 0 });
  };

  const saveProduct = async (id) => {
    const { error } = await supabase.from('products').update(editForm).eq('id', id);
    if (!error) {
      setEditingId(null);
      fetchData();
      alert("ပြင်ဆင်မှု အောင်မြင်ပါသည်။");
    }
  };

  // အရောင်း (POS)
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
    const summary = cart.map(i => `${i.name} (Qty: ${i.qty})`).join(', ');
    
    const { error } = await supabase.from('orders').insert([{ total_amount: total, device_name: summary }]);
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      }
      if (window.confirm("ရောင်းချမှုအောင်မြင်သည်။ Print ထုတ်မလား?")) window.print();
      setCart([]); fetchData();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f0f2f5' }}>
      {/* Sidebar */}
      <div className="no-print" style={{ width: '260px', background: '#1c1e21', color: '#fff', padding: '20px' }}>
        <h2 style={{ color: '#4e73df' }}>SmartPOS Master</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => setView('pos')} style={navBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('inventory')} style={navBtn(view==='inventory')}><Package size={18}/> စတော့စီမံခြင်း/Code</button>
          <button onClick={() => setView('purchase')} style={navBtn(view==='purchase')}><PlusCircle size={18}/> အဝယ်ဘောင်ချာ</button>
          <button onClick={() => setView('history')} style={navBtn(view==='history')}><Calendar size={18}/> စာရင်းများ</button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="no-print" style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <input placeholder="နာမည် သို့မဟုတ် Code ဖြင့်ရှာပါ..." style={searchInput} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} style={cardStyle}>
                    <small style={{color:'#888'}}>#{p.product_code || 'Code မရှိ'}</small>
                    <div style={{fontWeight:'bold', height:'40px'}}>{p.name}</div>
                    <div style={{color:'#4e73df', fontWeight:'bold'}}>{p.price} K</div>
                    <div style={{fontSize:'12px', color: p.stock_quantity < 5 ? 'red' : '#666'}}>Qty: {p.stock_quantity}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartPanel}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              <div style={{flex:1, overflowY:'auto'}}>
                {cart.map((c,i)=><div key={i} style={cartItem}>{c.name} <span style={{fontWeight:'bold'}}>x {c.qty}</span></div>)}
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
            <h3>📦 စတော့စီမံခြင်း (Code နှင့် စျေးနှုန်းပြင်ရန်)</h3>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead><tr style={{textAlign:'left', borderBottom:'2px solid #ddd'}}><th>Code</th><th>ပစ္စည်းအမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                    {editingId === p.id ? (
                      <>
                        <td><input style={smallInput} value={editForm.product_code} onChange={e=>setEditForm({...editForm, product_code:e.target.value})}/></td>
                        <td><input style={smallInput} value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})}/></td>
                        <td><input style={smallInput} type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price:Number(e.target.value)})}/></td>
                        <td><input style={smallInput} type="number" value={editForm.cost_price} onChange={e=>setEditForm({...editForm, cost_price:Number(e.target.value)})}/></td>
                        <td><button onClick={()=>saveProduct(p.id)} style={{background:'#10b981', color:'#fff', border:'none', padding:'5px', borderRadius:'4px'}}><Check size={16}/></button></td>
                      </>
                    ) : (
                      <>
                        <td style={{padding:'10px'}}>{p.product_code || <span style={{color:'red'}}>Code ထည့်ရန်</span>}</td>
                        <td>{p.name}</td>
                        <td>{p.price} K</td>
                        <td>{p.cost_price || 0} K</td>
                        <td><button onClick={()=>startEdit(p)} style={{background:'none', border:'none', cursor:'pointer', color:'#4e73df'}}><Edit3 size={16}/></button></td>
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
              {products.map(p => <option key={p.id} value={p.id}>{p.name} (ကျန်: {p.stock_quantity})</option>)}
            </select>
            <input placeholder="ဝယ်ယူသည့်အရေအတွက် (Qty)" type="number" style={inputStyle} onChange={e => setPurchaseForm({...purchaseForm, qty: e.target.value})} />
            <button onClick={async () => {
               await supabase.rpc('handle_purchase', { p_id: purchaseForm.productId, quantity_to_add: parseInt(purchaseForm.qty) });
               alert("စတော့တိုးပြီးပါပြီ"); fetchData();
            }} style={btnPrimary}>စတော့ပေါင်းမည်</button>
          </div>
        )}
      </div>

      {/* Print Only Area */}
      <style>{`@media print {.no-print {display:none;} .print-only {display:block !important;}} .print-only {display:none; font-family:monospace; padding:20px;}`}</style>
      <div className="print-only">
        <center><h2>INVOICE</h2><hr/>
        {cart.map((c, i) => <div key={i}>{c.name} x {c.qty} ... {c.price * c.qty} K</div>)}
        <hr/><h3>Total: {cart.reduce((a,b)=>a+(b.price*b.qty),0)} K</h3></center>
      </div>
    </div>
  );
}

const navBtn = (sel) => ({ width: '100%', padding: '12px', textAlign: 'left', background: sel ? '#4e73df' : 'none', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' });
const cardStyle = { background: '#fff', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', textAlign:'center' };
const cartPanel = { width: '300px', background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const cartItem = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize:'14px' };
const searchInput = { width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const smallInput = { width: '90%', padding: '5px', borderRadius: '4px', border: '1px solid #4e73df' };
const btnPrimary = { width: '100%', padding: '12px', background: '#4e73df', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const formBox = { maxWidth: '400px', background: '#fff', padding: '25px', borderRadius: '15px' };
const tableCard = { background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
