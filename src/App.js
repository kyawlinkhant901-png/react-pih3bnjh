import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, AlertCircle, Save, X, Layers, History, TrendingUp } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos'); // pos, inventory, reports
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  
  // Odoo-style Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({ name: '', price: 0, cost_price: 0, stock_quantity: 0, product_code: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
  }

  // --- Inventory Management (Odoo Style) ---
  const handleSaveProduct = async () => {
    if (isEditing) {
      await supabase.from('products').update(currentProduct).eq('id', currentProduct.id);
    } else {
      await supabase.from('products').insert([currentProduct]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const deleteProduct = async (id) => {
    if (window.confirm("ဤပစ္စည်းကို ဖျက်လိုက်လျှင် စာရင်းများပါ ပျက်နိုင်ပါသည်။ ဖျက်မှာ သေချာပါသလား?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  };

  // --- POS Logic ---
  const addToCart = (p) => {
    const existing = cart.find(i => i.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...p, qty: 1 }]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const totalCost = cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);
    const profit = total - totalCost;
    const itemsSummary = cart.map(i => `${i.name} x${i.qty}`).join(', ');

    const { data, error } = await supabase.from('orders').insert([
      { total_amount: total, device_name: itemsSummary, profit: profit, items_json: cart }
    ]);

    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      }
      alert("ဘောင်ချာ ပိတ်ပြီးပါပြီ။ စတော့ လျော့လိုက်ပါပြီ။");
      setCart([]); fetchData();
    }
  };

  const deleteOrder = async (id) => {
    if (window.confirm("ဤအရောင်းဘောင်ချာကို ဖျက်မှာ သေချာပါသလား?")) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div style={odooContainer}>
      {/* Navbar */}
      <div style={odooNavbar}>
        <div style={{display:'flex', alignItems:'center', gap:'30px'}}>
          <b style={{fontSize:'20px'}}>Odoo <span style={{fontWeight:'normal'}}>POS</span></b>
          <button onClick={()=>setView('pos')} style={view==='pos'?activeNav:navBtn}><ShoppingCart size={18}/> အရောင်း</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?activeNav:navBtn}><Layers size={18}/> စတော့စီမံခြင်း</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?activeNav:navBtn}><TrendingUp size={18}/> အစီရင်ခံစာ</button>
        </div>
      </div>

      <div style={odooBody}>
        {view === 'pos' && (
          <div style={{display:'flex', height:'100%'}}>
            {/* Cart Panel */}
            <div style={odooCart}>
              <div style={cartHeader}>ဘောင်ချာအသစ်</div>
              <div style={cartItems}>
                {cart.map((item, idx) => (
                  <div key={idx} style={cartRow}>
                    <div><b>{item.name}</b><br/><small>{item.qty} x {item.price} K</small></div>
                    <b>{item.price * item.qty} K</b>
                  </div>
                ))}
              </div>
              <div style={cartSummary}>
                <div style={totalRow}><span>စုစုပေါင်း</span><span>{cart.reduce((a,b)=>a+(b.price*b.qty),0)} K</span></div>
                <button onClick={handleCheckout} style={payBtn}>PAYMENT</button>
              </div>
            </div>

            {/* Product Grid */}
            <div style={odooProducts}>
              <div style={searchBox}>
                <Search size={18} color="#666"/>
                <input placeholder="ပစ္စည်းအမည်/Code ဖြင့်ရှာရန်..." onChange={e=>setSearch(e.target.value)} style={searchInp}/>
              </div>
              <div style={grid}>
                {products.filter(p => p.name.includes(search)).map(p => (
                  <div key={p.id} onClick={()=>addToCart(p)} style={pCard}>
                    <div style={pImg}><Package color="#ddd"/></div>
                    <div style={{padding:'10px'}}>
                      <div style={pName}>{p.name}</div>
                      <div style={pPrice}>{p.price} K</div>
                      <div style={{fontSize:'10px', color: p.stock_quantity<5?'red':'#999'}}>စတော့: {p.stock_quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div style={odooTableCard}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h3>Inventory Control</h3>
              <button onClick={()=>{setIsEditing(false); setCurrentProduct({name:'', price:0, cost_price:0, stock_quantity:0, product_code:''}); setIsModalOpen(true)}} style={odooBtnPrimary}>+ Create Product</button>
            </div>
            <table style={odooTable}>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Sales Price</th><th>Cost</th><th>Stock</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.product_code || '-'}</td>
                    <td>{p.name}</td>
                    <td>{p.price} K</td>
                    <td>{p.cost_price} K</td>
                    <td style={{color: p.stock_quantity<5?'red':'inherit'}}>{p.stock_quantity}</td>
                    <td>
                      <Edit3 size={16} onClick={()=>{setIsEditing(true); setCurrentProduct(p); setIsModalOpen(true)}} style={actionIcon}/>
                      <Trash2 size={16} onClick={()=>deleteProduct(p.id)} style={{...actionIcon, color:'red'}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'reports' && (
          <div style={odooTableCard}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px', marginBottom:'30px'}}>
               <div style={statBox}><h5>Total Revenue</h5><h3>{orders.reduce((a,b)=>a+Number(b.total_amount),0).toLocaleString()} K</h3></div>
               <div style={statBox}><h5>Net Profit</h5><h3 style={{color:'#00A09D'}}>{orders.reduce((a,b)=>a+Number(b.profit || 0),0).toLocaleString()} K</h3></div>
               <div style={statBox}><h5>Total Invoices</h5><h3>{orders.length}</h3></div>
            </div>
            <h3>Sales History</h3>
            <table style={odooTable}>
               <thead><tr><th>Date</th><th>Items</th><th>Amount</th><th>Profit</th><th>Action</th></tr></thead>
               <tbody>
                 {orders.map(o => (
                   <tr key={o.id}>
                     <td>{new Date(o.created_at).toLocaleDateString()}</td>
                     <td>{o.device_name}</td>
                     <td>{o.total_amount} K</td>
                     <td>{o.profit} K</td>
                     <td><Trash2 size={16} color="red" onClick={()=>deleteOrder(o.id)} style={{cursor:'pointer'}}/></td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Odoo Style Modal */}
      {isModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>{isEditing ? 'Edit Product' : 'New Product'}</h3>
            <hr/>
            <div style={{marginTop:'15px'}}>
              <label style={label}>Product Name</label>
              <input style={odooInput} value={currentProduct.name} onChange={e=>setCurrentProduct({...currentProduct, name:e.target.value})}/>
              <div style={{display:'flex', gap:'10px'}}>
                <div style={{flex:1}}><label style={label}>Sales Price</label><input type="number" style={odooInput} value={currentProduct.price} onChange={e=>setCurrentProduct({...currentProduct, price:Number(e.target.value)})}/></div>
                <div style={{flex:1}}><label style={label}>Cost Price</label><input type="number" style={odooInput} value={currentProduct.cost_price} onChange={e=>setCurrentProduct({...currentProduct, cost_price:Number(e.target.value)})}/></div>
              </div>
              <label style={label}>Stock Quantity</label>
              <input type="number" style={odooInput} value={currentProduct.stock_quantity} onChange={e=>setCurrentProduct({...currentProduct, stock_quantity:Number(e.target.value)})}/>
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button onClick={handleSaveProduct} style={odooBtnPrimary}>SAVE</button>
              <button onClick={()=>setIsModalOpen(false)} style={odooBtnSecondary}>DISCARD</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Odoo Logic Styles ---
const odooContainer = { height:'100vh', display:'flex', flexDirection:'column', background:'#F0F2F5', fontFamily:'sans-serif' };
const odooNavbar = { background:'#875A7B', color:'white', padding:'10px 20px', display:'flex', alignItems:'center' };
const navBtn = { background:'none', border:'none', color:'#eee', padding:'10px 15px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' };
const activeNav = { ...navBtn, background:'#714B67', borderRadius:'4px', color:'white' };
const odooBody = { flex:1, overflow:'hidden' };

// POS
const odooCart = { width:'380px', background:'white', display:'flex', flexDirection:'column', borderRight:'1px solid #ddd' };
const cartHeader = { padding:'15px', background:'#E9ECEF', fontWeight:'bold' };
const cartItems = { flex:1, overflowY:'auto', padding:'10px' };
const cartRow = { display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #eee' };
const cartSummary = { padding:'20px', background:'#F8F9FA', borderTop:'2px solid #ddd' };
const totalRow = { display:'flex', justifyContent:'space-between', fontSize:'24px', fontWeight:'bold', marginBottom:'15px', color:'#875A7B' };
const payBtn = { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', fontSize:'18px', cursor:'pointer' };

const odooProducts = { flex:1, padding:'20px', overflowY:'auto' };
const searchBox = { display:'flex', alignItems:'center', background:'white', padding:'10px 15px', borderRadius:'20px', marginBottom:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' };
const searchInp = { border:'none', outline:'none', marginLeft:'10px', width:'100%' };
const grid = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' };
const pCard = { background:'white', borderRadius:'8px', overflow:'hidden', cursor:'pointer', border:'1px solid #ddd' };
const pImg = { height:'80px', background:'#F8F9FA', display:'flex', justifyContent:'center', alignItems:'center' };
const pName = { fontSize:'14px', fontWeight:'bold', height:'35px', overflow:'hidden' };
const pPrice = { color:'#00A09D', fontWeight:'bold' };

// Inventory & Tables
const odooTableCard = { margin:'20px', padding:'25px', background:'white', borderRadius:'8px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' };
const odooTable = { width:'100%', borderCollapse:'collapse' };
const actionIcon = { cursor:'pointer', marginRight:'15px', color:'#666' };
const odooBtnPrimary = { padding:'10px 20px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer' };
const odooBtnSecondary = { padding:'10px 20px', background:'#E9ECEF', color:'#333', border:'none', borderRadius:'4px', cursor:'pointer' };

// Modal
const modalOverlay = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalBox = { background:'white', padding:'30px', borderRadius:'8px', width:'450px' };
const odooInput = { width:'100%', padding:'10px', margin:'8px 0 15px 0', border:'1px solid #ddd', borderRadius:'4px' };
const label = { fontSize:'13px', fontWeight:'bold', color:'#666' };
const statBox = { background:'#F8F9FA', padding:'20px', borderRadius:'8px', borderLeft:'4px solid #875A7B' };
