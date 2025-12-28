import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, Wifi, WifiOff, CloudUpload, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: 0, cost_price: 0, stock_quantity: 0, product_code: '' });

  useEffect(() => {
    fetchData();
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, [isOnline]);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
    if (isOnline) localStorage.setItem('products_cache', JSON.stringify(p || []));
  }

  // Cart Functions
  const addToCart = (p) => {
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...p, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    const existing = cart.find(i => i.id === id);
    if (existing.qty > 1) {
      setCart(cart.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i));
    } else {
      setCart(cart.filter(i => i.id !== id));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const profit = total - cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);
    const summary = cart.map(i => `${i.name} x${i.qty}`).join(', ');

    const { error } = await supabase.from('orders').insert([{ total_amount: total, device_name: summary, profit }]);
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      }
      setCart([]); fetchData();
      alert("ဘောင်ချာ သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ margin: 0, color: '#714B67' }}>Odoo POS</h2>
          <nav style={navGroup}>
            <button onClick={() => setView('pos')} style={view === 'pos' ? activeNav : navItem}>အရောင်း</button>
            <button onClick={() => setView('inventory')} style={view === 'inventory' ? activeNav : navItem}>ပစ္စည်းစီမံခြင်း</button>
            <button onClick={() => setView('history')} style={view === 'history' ? activeNav : navItem}>Dashboard</button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isOnline ? <Wifi color="#10b981" size={20}/> : <WifiOff color="#ef4444" size={20}/>}
          <div style={userBadge}>Admin</div>
        </div>
      </div>

      <div style={mainBody}>
        {view === 'pos' && (
          <div style={posLayout}>
            {/* Left: Cart */}
            <div style={cartContainer}>
              <div style={cartHeader}>လက်ရှိဘောင်ချာ</div>
              <div style={cartList}>
                {cart.length === 0 ? <div style={emptyCart}>ပစ္စည်းရွေးပါ</div> : cart.map(item => (
                  <div key={item.id} style={cartRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                      <small>{item.qty} x {item.price.toLocaleString()} K</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{(item.price * item.qty).toLocaleString()} K</div>
                      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                        <button onClick={() => removeFromCart(item.id)} style={btnCircle}><Minus size={12}/></button>
                        <button onClick={() => addToCart(item)} style={btnCircle}><Plus size={12}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={cartFooter}>
                <div style={totalLine}>
                  <span>Total</span>
                  <span>{cart.reduce((a, b) => a + (b.price * b.qty), 0).toLocaleString()} K</span>
                </div>
                <button onClick={handleCheckout} style={checkoutBtn}>Payment</button>
              </div>
            </div>

            {/* Right: Products */}
            <div style={productArea}>
              <div style={searchBar}>
                <Search size={20} color="#94a3b8" />
                <input 
                  placeholder="ပစ္စည်းရှာရန်..." 
                  style={searchInput} 
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={productGrid}>
                {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} style={productCard}>
                    <div style={productImg}><Package size={30} color="#e2e8f0"/></div>
                    <div style={productInfo}>
                      <div style={pName}>{p.name}</div>
                      <div style={pPrice}>{p.price.toLocaleString()} K</div>
                      <div style={pStock}>Stock: {p.stock_quantity}</div>
                    </div>
                    {p.stock_quantity <= 5 && <div style={lowStockTag}>!</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
           <div style={contentPage}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3>ပစ္စည်းနှင့် စတော့ စာရင်း</h3>
                <button onClick={() => {setEditingProduct(null); setProductForm({name:'', price:0, cost_price:0, stock_quantity:0, product_code:''}); setShowModal(true)}} style={actionBtn}>+ ပစ္စည်းအသစ်ထည့်ရန်</button>
              </div>
              <table style={odooTable}>
                <thead>
                  <tr><th>Code</th><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>စတော့</th><th>လုပ်ဆောင်ချက်</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.product_code || '-'}</td>
                      <td>{p.name}</td>
                      <td>{p.price} K</td>
                      <td>{p.cost_price} K</td>
                      <td style={{color: p.stock_quantity <= 5 ? 'red' : 'inherit'}}>{p.stock_quantity}</td>
                      <td>
                        <button onClick={()=>{setEditingProduct(p); setProductForm(p); setShowModal(true)}} style={iconBtn}><Edit3 size={16}/></button>
                        <button onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('products').delete().eq('id',p.id); fetchData()}}} style={iconBtn}><Trash2 size={16} color="red"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>{editingProduct ? 'ပြင်ဆင်ရန်' : 'အသစ်ထည့်ရန်'}</h3>
            <label>ပစ္စည်းအမည်</label>
            <input style={formInput} value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})}/>
            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex:1}}><label>ရောင်းစျေး</label><input type="number" style={formInput} value={productForm.price} onChange={e=>setProductForm({...productForm, price:Number(e.target.value)})}/></div>
              <div style={{flex:1}}><label>ရင်းစျေး</label><input type="number" style={formInput} value={productForm.cost_price} onChange={e=>setProductForm({...productForm, cost_price:Number(e.target.value)})}/></div>
            </div>
            <label>စတော့အရေအတွက်</label>
            <input type="number" style={formInput} value={productForm.stock_quantity} onChange={e=>setProductForm({...productForm, stock_quantity:Number(e.target.value)})}/>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button onClick={async()=>{
                const action = editingProduct ? supabase.from('products').update(productForm).eq('id', editingProduct.id) : supabase.from('products').insert([productForm]);
                await action; setShowModal(false); fetchData();
              }} style={saveBtn}>သိမ်းမည်</button>
              <button onClick={()=>setShowModal(false)} style={cancelBtn}>ပိတ်မည်</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Odoo Theme Styles ---
const container = { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f2f5', fontFamily: 'Segoe UI, sans-serif' };
const header = { height: '60px', background: '#875A7B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
const navGroup = { display: 'flex', marginLeft: '40px', gap: '5px' };
const navItem = { background: 'none', border: 'none', color: '#eee', padding: '10px 15px', cursor: 'pointer', fontSize: '15px' };
const activeNav = { ...navItem, background: '#714B67', borderRadius: '4px', color: 'white', fontWeight: 'bold' };
const mainBody = { flex: 1, display: 'flex', overflow: 'hidden' };
const posLayout = { display: 'flex', flex: 1, width: '100%' };

// Cart Styles
const cartContainer = { width: '400px', background: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd' };
const cartHeader = { padding: '15px', background: '#e9ecef', fontWeight: 'bold', borderBottom: '1px solid #ddd' };
const cartList = { flex: 1, overflowY: 'auto', padding: '10px' };
const cartRow = { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f3f5', alignItems: 'center' };
const cartFooter = { padding: '20px', background: '#f8f9fa', borderTop: '2px solid #ddd' };
const totalLine = { display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: 'bold', marginBottom: '15px', color: '#875A7B' };
const checkoutBtn = { width: '100%', padding: '15px', background: '#00A09D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' };

// Product Area
const productArea = { flex: 1, padding: '20px', overflowY: 'auto' };
const searchBar = { display: 'flex', alignItems: 'center', background: 'white', padding: '10px 20px', borderRadius: '25px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const searchInput = { flex: 1, border: 'none', marginLeft: '10px', fontSize: '16px', outline: 'none' };
const productGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' };
const productCard = { background: 'white', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.1s', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const productImg = { height: '100px', background: '#f8f9fa', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const productInfo = { padding: '10px', textAlign: 'center' };
const pName = { fontSize: '14px', fontWeight: '600', height: '40px', overflow: 'hidden' };
const pPrice = { color: '#00A09D', fontWeight: 'bold', marginTop: '5px' };
const pStock = { fontSize: '11px', color: '#666' };

// Inventory & Common
const contentPage = { flex: 1, padding: '30px', background: 'white', margin: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const odooTable = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const actionBtn = { padding: '10px 20px', background: '#875A7B', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const btnCircle = { width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center' };
const modalContent = { background:'white', padding:'30px', borderRadius:'15px', width:'450px' };
const formInput = { width:'100%', padding:'10px', margin:'10px 0', borderRadius:'5px', border:'1px solid #ddd' };
const saveBtn = { flex:1, padding:'12px', background:'#00A09D', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' };
const cancelBtn = { flex:1, padding:'12px', background:'#6c757d', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' };
const lowStockTag = { position:'absolute', top:'5px', right:'5px', background:'red', color:'white', width:'20px', height:'20px', borderRadius:'50%', textAlign:'center', fontSize:'14px' };
const iconBtn = { background:'none', border:'none', cursor:'pointer', padding:'5px' };
const userBadge = { background: '#714B67', padding: '5px 15px', borderRadius: '15px', fontSize: '13px' };
const emptyCart = { textAlign:'center', color:'#999', marginTop:'50px' };
