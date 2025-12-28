import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, CreditCard, Wallet, Keyboard, ScanBarcode, Tag, X, CheckCircle
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);

  // Modals
  const [isProductModal, setIsProductModal] = useState(false);
  const [isExpenseModal, setIsExpenseModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
    const handleKeys = (e) => {
      const keys = { 'F1':'pos', 'F2':'purchase', 'F3':'inventory', 'F4':'accounting', 'F5':'reports' };
      if (keys[e.key]) setView(keys[e.key]);
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: ph } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    const { data: ex } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []); setPurchaseHistory(ph || []); setExpenses(ex || []);
  }

  // --- POS Barcode Support ---
  const handleBarcode = (val) => {
    setSearch(val);
    const p = products.find(x => x.product_code === val);
    if (p) {
      setCart([...cart, { ...p, qty: 1 }]);
      setSearch('');
    }
  };

  // --- အရောင်းသိမ်းဆည်းခြင်း ---
  const handleSalesCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0) * (1 - discount/100);
    const profit = total - cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);
    const { error } = await supabase.from('orders').insert([{ total_amount: total, device_name: cart.map(i => `${i.name} x${i.qty}`).join(', '), profit, items_json: cart }]);
    if (!error) {
      for (const item of cart) await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      setCart([]); setDiscount(0); fetchData();
    }
  };

  // --- အဝယ်သိမ်းဆည်းခြင်း ---
  const handlePurchaseCheckout = async () => {
    if (purchaseCart.length === 0) return;
    const total = purchaseCart.reduce((a, b) => a + (b.cost_price * b.qty), 0);
    const { error } = await supabase.from('purchase_orders').insert([{ total_amount: total, items_json: purchaseCart }]);
    if (!error) {
      for (const item of purchaseCart) await supabase.rpc('handle_purchase', { p_id: item.id, quantity_to_add: item.qty });
      setPurchaseCart([]); fetchData();
    }
  };

  // --- ဖျက်ခြင်း Logic (စတော့ပြန်ချိန်ညှိမှုပါဝင်သည်) ---
  const deleteOrder = async (order) => {
    if (window.confirm("အရောင်းဘောင်ချာဖျက်မှာလား? စတော့ပြန်တိုးပါမယ်။")) {
      await supabase.from('orders').delete().eq('id', order.id);
      await supabase.rpc('handle_order_delete', { p_items_json: order.items_json });
      fetchData();
    }
  };

  const deletePurchase = async (pOrder) => {
    if (window.confirm("အဝယ်ဘောင်ချာဖျက်မှာလား? စတော့ပြန်လျော့ပါမယ်။")) {
      await supabase.from('purchase_orders').delete().eq('id', pOrder.id);
      await supabase.rpc('handle_purchase_delete', { p_items_json: pOrder.items_json });
      fetchData();
    }
  };

  return (
    <div style={odooContainer}>
      {/* Header with Shortcut Hints */}
      <div style={odooNavbar}>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={()=>setView('pos')} style={view==='pos'?activeNav:navBtn}>F1 POS</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?activeNav:navBtn}>F2 Purchase</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?activeNav:navBtn}>F3 Stock</button>
          <button onClick={()=>setView('accounting')} style={view==='accounting'?activeNav:navBtn}>F4 Expense</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?activeNav:navBtn}>F5 Report</button>
        </div>
        <div style={{fontSize:'12px', opacity:0.8}}>Smart POS Pro v2.0</div>
      </div>

      <div style={mainBody}>
        {/* --- POS View --- */}
        {view === 'pos' && (
          <div style={posLayout}>
            <div style={cartPanel}>
              <div style={cartHeader}>ဘောင်ချာအသစ်</div>
              <div style={cartItems}>{cart.map((item, i)=><div key={i} style={cartRow}><span>{item.name} x{item.qty}</span><b>{item.price*item.qty} K</b></div>)}</div>
              <div style={cartFooter}>
                <div style={totalLine}>Total: {(cart.reduce((a,b)=>a+(b.price*b.qty),0)*(1-discount/100)).toLocaleString()} K</div>
                <button onClick={handleSalesCheckout} style={payBtn}>CHECKOUT</button>
              </div>
            </div>
            <div style={productArea}>
              <div style={searchBar}><ScanBarcode size={20}/><input autoFocus value={search} onChange={e=>handleBarcode(e.target.value)} placeholder="Scan Barcode or Search..." style={searchInp}/></div>
              <div style={grid}>{products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=><div key={p.id} onClick={()=>setCart([...cart,{...p,qty:1}])} style={pCard}><b>{p.name}</b><br/>{p.price} K<br/><small>Stock: {p.stock_quantity}</small></div>)}</div>
            </div>
          </div>
        )}

        {/* --- Purchase View --- */}
        {view === 'purchase' && (
          <div style={posLayout}>
            <div style={cartPanel}>
              <div style={{...cartHeader, background:'#875A7B', color:'white'}}>အဝယ်စာရင်း</div>
              <div style={cartItems}>{purchaseCart.map((item, i)=><div key={i} style={cartRow}><span>{item.name} x{item.qty}</span><b>{item.cost_price*item.qty} K</b></div>)}</div>
              <div style={cartFooter}><button onClick={handlePurchaseCheckout} style={{...payBtn, background:'#875A7B'}}>SAVE PURCHASE</button></div>
            </div>
            <div style={productArea}>
               <div style={grid}>{products.map(p=><div key={p.id} onClick={()=>setPurchaseCart([...purchaseCart,{...p,qty:1}])} style={pCard}><b>{p.name}</b><br/><small>Cost: {p.cost_price}</small></div>)}</div>
            </div>
          </div>
        )}

        {/* --- Reports & History View --- */}
        {view === 'reports' && (
          <div style={pageContent}>
            <h3>Reports (အရောင်းနှင့် အဝယ်မှတ်တမ်း)</h3>
            <div style={reportGrid}>
               <div style={statBox}><h4>Daily Sales</h4><h2>{orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).reduce((a,b)=>a+Number(b.total_amount),0).toLocaleString()} K</h2></div>
               <div style={statBox}><h4>Total Profit</h4><h2>{orders.reduce((a,b)=>a+(b.profit||0),0).toLocaleString()} K</h2></div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
               <div>
                 <h4>Sales History (အရောင်း)</h4>
                 <table style={odooTable}>
                    <thead><tr><th>Date</th><th>Detail</th><th>Amount</th><th>X</th></tr></thead>
                    <tbody>{orders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.device_name}</td><td>{o.total_amount}</td><td><Trash2 size={14} color="red" onClick={()=>deleteOrder(o)}/></td></tr>)}</tbody>
                 </table>
               </div>
               <div>
                 <h4>Purchase History (အဝယ်)</h4>
                 <table style={odooTable}>
                    <thead><tr><th>Date</th><th>Amount</th><th>X</th></tr></thead>
                    <tbody>{purchaseHistory.map(ph=><tr key={ph.id}><td>{new Date(ph.created_at).toLocaleDateString()}</td><td>{ph.total_amount} K</td><td><Trash2 size={14} color="red" onClick={()=>deletePurchase(ph)}/></td></tr>)}</tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* --- Inventory View --- */}
        {view === 'inventory' && (
          <div style={pageContent}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h3>Inventory</h3><button onClick={()=>{setEditingItem(null); setIsProductModal(true)}} style={odooBtn}>+ New Product</button></div>
            <table style={odooTable}>
              <thead><tr><th>Code</th><th>Name</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
              <tbody>{products.map(p=><tr key={p.id}><td>{p.product_code}</td><td>{p.name}</td><td>{p.price}</td><td style={{color:p.stock_quantity<5?'red':'black'}}>{p.stock_quantity}</td><td><Edit3 size={16} onClick={()=>{setEditingItem(p); setIsProductModal(true)}}/><Trash2 size={16} color="red" onClick={async()=>{if(window.confirm("Delete?")){await supabase.from('products').delete().eq('id',p.id); fetchData()}}}/></td></tr>)}</tbody>
            </table>
          </div>
        )}
        
        {/* --- Expense View --- */}
        {view === 'accounting' && (
          <div style={pageContent}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h3>Expenses</h3><button onClick={()=>setIsExpenseModal(true)} style={odooBtn}>+ Add Expense</button></div>
            <table style={odooTable}>
              <thead><tr><th>Date</th><th>Title</th><th>Amount</th></tr></thead>
              <tbody>{expenses.map(ex=><tr key={ex.id}><td>{new Date(ex.created_at).toLocaleDateString()}</td><td>{ex.title}</td><td>{ex.amount} K</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isProductModal && (
        <div style={modalOverlay}>
          <form style={modalBox} onSubmit={async(e)=>{
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.target));
            if(editingItem) await supabase.from('products').update(d).eq('id', editingItem.id);
            else await supabase.from('products').insert([d]);
            setIsProductModal(false); fetchData();
          }}>
            <h3>Product Info</h3>
            <input name="name" placeholder="Name" defaultValue={editingItem?.name} style={odooInp} required/>
            <input name="product_code" placeholder="Barcode" defaultValue={editingItem?.product_code} style={odooInp}/>
            <input name="price" type="number" placeholder="Sales Price" defaultValue={editingItem?.price} style={odooInp} required/>
            <input name="cost_price" type="number" placeholder="Cost Price" defaultValue={editingItem?.cost_price} style={odooInp} required/>
            <input name="stock_quantity" type="number" placeholder="Stock" defaultValue={editingItem?.stock_quantity} style={odooInp} required/>
            <button type="submit" style={saveBtn}>SAVE</button>
            <button type="button" onClick={()=>setIsProductModal(false)} style={cancelBtn}>CANCEL</button>
          </form>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>New Expense</h3>
            <input id="ext" placeholder="Title" style={odooInp}/><input id="exa" type="number" placeholder="Amount" style={odooInp}/>
            <button onClick={async()=>{await supabase.from('expenses').insert([{title:document.getElementById('ext').value, amount:document.getElementById('exa').value}]); setIsExpenseModal(false); fetchData();}} style={saveBtn}>SAVE</button>
            <button onClick={()=>setIsExpenseModal(false)} style={cancelBtn}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles (Odoo Enterprise Style) ---
const odooContainer = { height:'100vh', display:'flex', flexDirection:'column', background:'#F0F2F5', fontFamily:'sans-serif' };
const odooNavbar = { background:'#875A7B', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' };
const navBtn = { background:'none', border:'none', color:'#eee', padding:'10px 15px', cursor:'pointer', fontSize:'13px' };
const activeNav = { ...navBtn, background:'#714B67', borderRadius:'4px', color:'white', fontWeight:'bold' };
const mainBody = { flex:1, overflow:'hidden' };
const posLayout = { display:'flex', height:'100%' };
const cartPanel = { width:'380px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' };
const cartHeader = { padding:'15px', background:'#e9ecef', fontWeight:'bold', textAlign:'center' };
const cartItems = { flex:1, overflowY:'auto', padding:'15px' };
const cartRow = { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #eee', fontSize:'14px' };
const cartFooter = { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' };
const totalLine = { fontSize:'22px', fontWeight:'bold', color:'#875A7B', textAlign:'center', marginBottom:'15px' };
const payBtn = { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer' };
const productArea = { flex:1, padding:'20px', overflowY:'auto' };
const searchBar = { display:'flex', alignItems:'center', background:'white', padding:'10px 15px', borderRadius:'25px', marginBottom:'20px', border:'1px solid #ddd' };
const searchInp = { border:'none', outline:'none', marginLeft:'10px', width:'100%' };
const grid = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'15px' };
const pCard = { background:'white', padding:'10px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer' };
const odooTable = { width:'100%', borderCollapse:'collapse', marginTop:'15px', background:'white', fontSize:'13px' };
const pageContent = { padding:'30px', overflowY:'auto', height:'100%' };
const odooBtn = { padding:'10px 20px', background:'#875A7B', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' };
const modalOverlay = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalBox = { background:'white', padding:'25px', borderRadius:'8px', width:'350px', display:'flex', flexDirection:'column' };
const odooInp = { padding:'10px', margin:'5px 0', border:'1px solid #ddd', borderRadius:'4px' };
const saveBtn = { padding:'12px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', marginTop:'10px' };
const cancelBtn = { padding:'10px', background:'#6c757d', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', marginTop:'5px' };
const statBox = { background:'white', padding:'20px', borderRadius:'8px', borderLeft:'5px solid #875A7B', boxShadow:'0 2px 5px rgba(0,0,0,0.1)', textAlign:'center' };
const reportGrid = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' };
