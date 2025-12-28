import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, CreditCard, Wallet, Calendar, Tag, ScanBarcode, 
  RefreshCcw, Settings, Filter
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]); // အဝယ်ဘောင်ချာအတွက်
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);

  // Modals & Forms
  const [isProductModal, setIsProductModal] = useState(false);
  const [isExpenseModal, setIsExpenseModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: ex } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
    setExpenses(ex || []);
  }

  // --- (၁) အရောင်း POS Logic ---
  const handleSalesCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0) * (1 - discount/100);
    const profit = total - cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);

    const { error } = await supabase.from('orders').insert([
      { total_amount: total, device_name: cart.map(i => `${i.name} x${i.qty}`).join(', '), profit, items_json: cart }
    ]);

    if (!error) {
      for (const item of cart) await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      setCart([]); setDiscount(0); fetchData();
      alert("အရောင်းဘောင်ချာ ပိတ်ပြီးပါပြီ။");
    }
  };

  // --- (၂) အဝယ် POS Logic (Purchase Voucher) ---
  const handlePurchaseCheckout = async () => {
    if (purchaseCart.length === 0) return;
    const total = purchaseCart.reduce((a, b) => a + (b.cost_price * b.qty), 0);

    const { error } = await supabase.from('purchase_orders').insert([
      { total_amount: total, items_json: purchaseCart }
    ]);

    if (!error) {
      for (const item of purchaseCart) await supabase.rpc('handle_purchase', { p_id: item.id, quantity_to_add: item.qty });
      setPurchaseCart([]); fetchData();
      alert("အဝယ်ဘောင်ချာ သိမ်းဆည်းပြီး စတော့တိုးလိုက်ပါပြီ။");
    }
  };

  // --- (၃) စတော့လက်ကျန် Edit/Delete Logic ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (editingItem) {
      await supabase.from('products').update(data).eq('id', editingItem.id);
    } else {
      await supabase.from('products').insert([data]);
    }
    setIsProductModal(false); setEditingItem(null); fetchData();
  };

  // --- (၄) Report Logic (Daily/Monthly) ---
  const todaySales = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
                           .reduce((a, b) => a + Number(b.total_amount), 0);

  return (
    <div style={odooContainer}>
      {/* Navbar */}
      <div style={odooNavbar}>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <b style={{fontSize:'20px'}}>Smart POS Pro</b>
          <button onClick={()=>setView('pos')} style={view==='pos'?activeNav:navBtn}><ShoppingCart size={18}/> အရောင်း</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?activeNav:navBtn}><CreditCard size={18}/> အဝယ်</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?activeNav:navBtn}><Package size={18}/> စတော့/ပစ္စည်း</button>
          <button onClick={()=>setView('accounting')} style={view==='accounting'?activeNav:navBtn}><Wallet size={18}/> အသုံးစရိတ်</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?activeNav:navBtn}><BarChart3 size={18}/> လချုပ်/Report</button>
        </div>
      </div>

      <div style={mainBody}>
        {/* --- View: အရောင်း POS --- */}
        {view === 'pos' && (
          <div style={posLayout}>
            <div style={cartPanel}>
              <div style={cartHeader}>အရောင်းဘောင်ချာ</div>
              <div style={cartItems}>{cart.map((item, i) => <div key={i} style={cartRow}><span>{item.name} x{item.qty}</span><b>{item.price * item.qty} K</b></div>)}</div>
              <div style={cartFooter}>
                <div style={promoRow}>Discount %: <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} style={smallInp}/></div>
                <div style={totalLine}><span>Total:</span><span>{(cart.reduce((a,b)=>a+(b.price*b.qty),0)*(1-discount/100)).toLocaleString()} K</span></div>
                <button onClick={handleSalesCheckout} style={payBtn}>အရောင်းသိမ်းမည်</button>
              </div>
            </div>
            <div style={productArea}>
              <div style={searchBar}><Search size={18}/><input placeholder="ပစ္စည်းရှာရန်..." onChange={e=>setSearch(e.target.value)} style={searchInp}/></div>
              <div style={grid}>{products.filter(p=>p.name.includes(search)).map(p=><div key={p.id} onClick={()=>setCart([...cart, {...p, qty:1}])} style={pCard}><b>{p.name}</b><br/>{p.price} K<br/><small>Stock: {p.stock_quantity}</small></div>)}</div>
            </div>
          </div>
        )}

        {/* --- View: အဝယ် POS --- */}
        {view === 'purchase' && (
          <div style={posLayout}>
            <div style={{...cartPanel, borderRight:'none', borderLeft:'1px solid #ddd'}}>
              <div style={{...cartHeader, background:'#875A7B', color:'white'}}>အဝယ်ဘောင်ချာ (စတော့တိုး)</div>
              <div style={cartItems}>{purchaseCart.map((item, i) => <div key={i} style={cartRow}><span>{item.name} x{item.qty}</span><b>{item.cost_price * item.qty} K</b></div>)}</div>
              <div style={cartFooter}>
                <h3>Total: {purchaseCart.reduce((a,b)=>a+(b.cost_price*b.qty),0).toLocaleString()} K</h3>
                <button onClick={handlePurchaseCheckout} style={{...payBtn, background:'#875A7B'}}>အဝယ်သိမ်းမည်</button>
              </div>
            </div>
            <div style={productArea}>
              <div style={grid}>{products.map(p=><div key={p.id} onClick={()=>setPurchaseCart([...purchaseCart, {...p, qty:1}])} style={pCard}><b>{p.name}</b><br/><small>ရင်းစျေး: {p.cost_price} K</small></div>)}</div>
            </div>
          </div>
        )}

        {/* --- View: Inventory (Edit/Delete Stock) --- */}
        {view === 'inventory' && (
          <div style={pageContent}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h3>ပစ္စည်းစာရင်းနှင့် စတော့</h3><button onClick={()=>{setEditingItem(null); setIsProductModal(true)}} style={odooBtn}>+ ပစ္စည်းအသစ်</button></div>
            <table style={odooTable}>
              <thead><tr><th>Code</th><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>လက်ကျန်</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.product_code}</td><td>{p.name}</td><td>{p.price} K</td><td>{p.cost_price} K</td>
                    <td style={{color: p.stock_quantity<5?'red':'black', fontWeight:'bold'}}>{p.stock_quantity}</td>
                    <td>
                      <Edit3 size={16} onClick={()=>{setEditingItem(p); setIsProductModal(true)}} style={iconBtn}/>
                      <Trash2 size={16} onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('products').delete().eq('id', p.id); fetchData()}}} style={{...iconBtn, color:'red'}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- View: Reports (နေ့စဉ်/လချုပ်) --- */}
        {view === 'reports' && (
          <div style={pageContent}>
            <div style={reportGrid}>
              <div style={statBox}><h4>ယနေ့ရောင်းအား</h4><h2>{todaySales.toLocaleString()} K</h2></div>
              <div style={statBox}><h4>စုစုပေါင်းအမြတ်</h4><h2>{orders.reduce((a,b)=>a+(b.profit||0),0).toLocaleString()} K</h2></div>
              <div style={statBox}><h4>ဘောင်ချာစုစုပေါင်း</h4><h2>{orders.length}</h2></div>
            </div>
            <h3>အရောင်းမှတ်တမ်းများ</h3>
            <table style={odooTable}>
              <thead><tr><th>နေ့စွဲ</th><th>အသေးစိတ်</th><th>ပမာဏ</th><th>အမြတ်</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>{o.device_name}</td><td>{o.total_amount} K</td><td>{o.profit} K</td>
                    <td><Trash2 size={16} color="red" onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('orders').delete().eq('id', o.id); fetchData()}}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- View: Expenses --- */}
        {view === 'accounting' && (
          <div style={pageContent}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h3>အသုံးစရိတ်စာရင်း</h3><button onClick={()=>setIsExpenseModal(true)} style={odooBtn}>+ အသုံးစရိတ်ထည့်ရန်</button></div>
            <table style={odooTable}>
              <thead><tr><th>နေ့စွဲ</th><th>ခေါင်းစဉ်</th><th>ပမာဏ</th></tr></thead>
              <tbody>
                {expenses.map(ex => <tr key={ex.id}><td>{new Date(ex.created_at).toLocaleDateString()}</td><td>{ex.title}</td><td>{ex.amount} K</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal (Edit/Add) */}
      {isProductModal && (
        <div style={modalOverlay}>
          <form style={modalBox} onSubmit={handleSaveProduct}>
            <h3>{editingItem ? 'ပစ္စည်းပြင်ဆင်ရန်' : 'ပစ္စည်းအသစ်'}</h3>
            <input name="name" placeholder="အမည်" defaultValue={editingItem?.name} style={odooInp} required/>
            <input name="product_code" placeholder="Barcode/Code" defaultValue={editingItem?.product_code} style={odooInp}/>
            <input name="price" type="number" placeholder="ရောင်းစျေး" defaultValue={editingItem?.price} style={odooInp} required/>
            <input name="cost_price" type="number" placeholder="ရင်းစျေး" defaultValue={editingItem?.cost_price} style={odooInp} required/>
            <input name="stock_quantity" type="number" placeholder="လက်ရှိစတော့" defaultValue={editingItem?.stock_quantity} style={odooInp} required/>
            <div style={{display:'flex', gap:'10px'}}><button type="submit" style={saveBtn}>သိမ်းမည်</button><button onClick={()=>setIsProductModal(false)} style={cancelBtn}>ပိတ်မည်</button></div>
          </form>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>အသုံးစရိတ်အသစ်</h3>
            <input id="ex_title" placeholder="ခေါင်းစဉ် (ဥပမာ-မီးခ)" style={odooInp}/>
            <input id="ex_amount" type="number" placeholder="ပမာဏ" style={odooInp}/>
            <button onClick={async()=>{
              const title = document.getElementById('ex_title').value;
              const amount = document.getElementById('ex_amount').value;
              await supabase.from('expenses').insert([{title, amount}]);
              setIsExpenseModal(false); fetchData();
            }} style={saveBtn}>သိမ်းမည်</button>
            <button onClick={()=>setIsExpenseModal(false)} style={cancelBtn}>ပိတ်မည်</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles (Odoo Pro Theme) ---
const odooContainer = { height:'100vh', display:'flex', flexDirection:'column', background:'#F0F2F5', fontFamily:'sans-serif' };
const odooNavbar = { background:'#875A7B', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' };
const navBtn = { background:'none', border:'none', color:'#eee', padding:'10px 15px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontSize:'14px' };
const activeNav = { ...navBtn, background:'#714B67', borderRadius:'4px', color:'white', fontWeight:'bold' };
const mainBody = { flex:1, overflow:'hidden' };
const posLayout = { display:'flex', height:'100%' };
const cartPanel = { width:'400px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' };
const cartHeader = { padding:'15px', background:'#e9ecef', fontWeight:'bold', textAlign:'center' };
const cartItems = { flex:1, overflowY:'auto', padding:'15px' };
const cartRow = { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' };
const cartFooter = { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' };
const totalLine = { display:'flex', justifyContent:'space-between', fontSize:'24px', fontWeight:'bold', color:'#875A7B', margin:'10px 0' };
const payBtn = { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', fontSize:'18px', cursor:'pointer' };
const productArea = { flex:1, padding:'20px', overflowY:'auto' };
const grid = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' };
const pCard = { background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' };
const odooTable = { width:'100%', borderCollapse:'collapse', marginTop:'20px', background:'white' };
const pageContent = { padding:'30px', overflowY:'auto', height:'100%' };
const odooBtn = { padding:'10px 20px', background:'#875A7B', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' };
const modalOverlay = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalBox = { background:'white', padding:'30px', borderRadius:'8px', width:'400px', display:'flex', flexDirection:'column' };
const odooInp = { padding:'10px', margin:'10px 0', border:'1px solid #ddd', borderRadius:'4px' };
const saveBtn = { flex:1, padding:'12px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold' };
const cancelBtn = { flex:1, padding:'12px', background:'#6c757d', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' };
const statBox = { background:'white', padding:'20px', borderRadius:'8px', textAlign:'center', borderLeft:'5px solid #875A7B', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' };
const reportGrid = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px', marginBottom:'30px' };
const iconBtn = { cursor:'pointer', marginRight:'15px' };
const searchBar = { display:'flex', alignItems:'center', background:'white', padding:'10px 15px', borderRadius:'25px', marginBottom:'20px', border:'1px solid #ddd' };
const searchInp = { border:'none', outline:'none', marginLeft:'10px', width:'100%' };
const promoRow = { fontSize:'14px', color:'#666', marginBottom:'5px' };
const smallInp = { width:'50px', marginLeft:'10px' };
