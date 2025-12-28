import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, CreditCard, Wallet, Keyboard, Tag, ScanBarcode } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);

  // --- Keyboard Shortcuts (F1, F2, F3, F4) ---
  useEffect(() => {
    const handleShortcuts = (e) => {
      if (e.key === 'F1') setView('pos');
      if (e.key === 'F2') setView('inventory');
      if (e.key === 'F3') setView('purchase');
      if (e.key === 'F4') setView('history');
      if (e.key === 'Enter' && cart.length > 0 && view === 'pos') handleCheckout();
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [cart, view]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
  }

  // --- Barcode Scanner Logic ---
  const handleBarcodeSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    const found = products.find(p => p.product_code === val);
    if (found) {
      addToCart(found);
      setSearch(''); // Scan ပြီးရင် ရှင်းထုတ်မယ်
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

  // --- Checkout Logic ---
  const handleCheckout = async () => {
    const subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const total = subtotal - (subtotal * (discount / 100));
    const profit = total - cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);

    const { error } = await supabase.from('orders').insert([
      { total_amount: total, device_name: cart.map(i => `${i.name} x${i.qty}`).join(', '), profit, items_json: cart }
    ]);

    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      }
      setCart([]); setDiscount(0); fetchData();
      alert("ရောင်းချမှု အောင်မြင်သည်။");
    }
  };

  // --- ORDER DELETE & STOCK RESTORE ---
  const deleteOrder = async (order) => {
    if (window.confirm("ဘောင်ချာဖျက်မှာ သေချာလား? စတော့ပြန်တိုးပါမယ်။")) {
      // ၁။ Database မှာ ဘောင်ချာဖျက်မယ်
      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (!error) {
        // ၂။ ဖျက်လိုက်တဲ့ ပစ္စည်းတွေအတွက် စတော့ပြန်တိုးပေးမယ့် RPC ကို ခေါ်မယ်
        await supabase.rpc('handle_order_delete', { p_items_json: order.items_json });
        fetchData();
        alert("ဘောင်ချာဖျက်ပြီး စတော့ပြန်တိုးလိုက်ပါပြီ။");
      }
    }
  };

  return (
    <div style={odooContainer}>
      {/* Sidebar & Shortcuts Info */}
      <div style={odooNavbar}>
        <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
          <b style={{fontSize:'18px'}}>ODOO POS PRO</b>
          <button onClick={()=>setView('pos')} style={view==='pos'?activeNav:navBtn}>F1 POS</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?activeNav:navBtn}>F2 Stock</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?activeNav:navBtn}>F3 အဝယ်</button>
          <button onClick={()=>setView('history')} style={view==='history'?activeNav:navBtn}>F4 မှတ်တမ်း</button>
        </div>
        <div style={shortcutHint}><Keyboard size={14}/> Enter - Pay</div>
      </div>

      <div style={mainBody}>
        {view === 'pos' && (
          <div style={posLayout}>
            {/* Left: Cart */}
            <div style={odooCart}>
              <div style={cartHeader}>ဘောင်ချာသစ်</div>
              <div style={cartItems}>
                {cart.map((item, idx) => (
                  <div key={idx} style={cartRow}>
                    <div><b>{item.name}</b><br/><small>{item.qty} x {item.price} K</small></div>
                    <div style={{textAlign:'right'}}>
                      <b>{item.price * item.qty} K</b><br/>
                      <Trash2 size={14} color="red" onClick={()=>setCart(cart.filter((_,i)=>i!==idx))} style={{cursor:'pointer'}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={cartAction}>
                <div style={promoBox}>
                  <Tag size={16}/> <label>Discount % : </label>
                  <input type="number" value={discount} onChange={e=>setDiscount(Number(e.target.value))} style={discountInp}/>
                </div>
                <div style={totalLine}>
                  <span>Total</span>
                  <span>{(cart.reduce((a,b)=>a+(b.price*b.qty),0) * (1 - discount/100)).toLocaleString()} K</span>
                </div>
                <button onClick={handleCheckout} style={payBtn}>CHECKOUT (Enter)</button>
              </div>
            </div>

            {/* Right: Products with Barcode Support */}
            <div style={odooProducts}>
              <div style={searchBar}>
                <ScanBarcode size={20} color="#875A7B"/>
                <input 
                  autoFocus 
                  placeholder="Barcode စကင်ဖတ်ပါ သို့မဟုတ် နာမည်ရိုက်ပါ..." 
                  value={search} 
                  onChange={handleBarcodeSearch} 
                  style={searchInp}
                />
              </div>
              <div style={grid}>
                {products.filter(p => p.name.includes(search) || p.product_code?.includes(search)).map(p => (
                  <div key={p.id} onClick={()=>addToCart(p)} style={pCard}>
                    <div style={pName}>{p.name}</div>
                    <div style={pPrice}>{p.price} K</div>
                    <div style={pStock}>Stock: {p.stock_quantity}</div>
                    <small style={{fontSize:'9px', color:'#999'}}>#{p.product_code}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div style={pageCard}>
            <h3>အရောင်းမှတ်တမ်း (ဖျက်လျှင် စတော့ပြန်တိုးမည်)</h3>
            <table style={odooTable}>
              <thead>
                <tr><th>Date</th><th>ဘောင်ချာအသေးစိတ်</th><th>Amount</th><th>Action</th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>{o.device_name}</td>
                    <td>{o.total_amount} K</td>
                    <td>
                      <Trash2 size={18} color="red" onClick={()=>deleteOrder(o)} style={{cursor:'pointer'}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Purchase Module */}
        {view === 'purchase' && (
          <div style={pageCard}>
            <h3>အဝယ်ဘောင်ချာ (စတော့တိုးရန်)</h3>
            <div style={purchaseFormBox}>
               <label>ပစ္စည်းရွေးရန်</label>
               <select style={odooInp} id="p_id">
                 {products.map(p => <option key={p.id} value={p.id}>{p.name} (လက်ကျန်: {p.stock_quantity})</option>)}
               </select>
               <label>ဝယ်ယူသည့်အရေအတွက်</label>
               <input type="number" style={odooInp} id="p_qty" />
               <button onClick={async()=>{
                 const id = document.getElementById('p_id').value;
                 const qty = document.getElementById('p_qty').value;
                 await supabase.rpc('handle_purchase', { p_id: id, quantity_to_add: parseInt(qty) });
                 fetchData(); alert("စတော့တိုးပြီးပါပြီ။");
               }} style={odooBtnPrimary}>ဝယ်ယူမှုအတည်ပြုမည်</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const odooContainer = { height:'100vh', display:'flex', flexDirection:'column', background:'#f0f2f5' };
const odooNavbar = { background:'#875A7B', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' };
const navBtn = { background:'none', border:'none', color:'#eee', padding:'8px 12px', cursor:'pointer', fontSize:'14px' };
const activeNav = { ...navBtn, background:'#714B67', borderRadius:'4px', color:'white', fontWeight:'bold' };
const mainBody = { flex:1, overflow:'hidden' };
const posLayout = { display:'flex', height:'100%' };
const odooCart = { width:'380px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' };
const cartHeader = { padding:'15px', background:'#e9ecef', fontWeight:'bold' };
const cartItems = { flex:1, overflowY:'auto', padding:'15px' };
const cartRow = { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' };
const cartAction = { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' };
const promoBox = { display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' };
const discountInp = { width:'60px', padding:'5px', borderRadius:'4px', border:'1px solid #ddd' };
const totalLine = { display:'flex', justifyContent:'space-between', fontSize:'24px', fontWeight:'bold', color:'#875A7B', marginBottom:'15px' };
const payBtn = { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer' };
const odooProducts = { flex:1, padding:'20px', overflowY:'auto' };
const searchBar = { display:'flex', alignItems:'center', background:'white', padding:'10px 15px', borderRadius:'25px', marginBottom:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' };
const searchInp = { border:'none', outline:'none', marginLeft:'10px', width:'100%', fontSize:'16px' };
const grid = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' };
const pCard = { background:'white', padding:'10px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer' };
const pName = { fontWeight:'bold', fontSize:'14px', height:'35px' };
const pPrice = { color:'#00A09D', fontWeight:'bold' };
const pStock = { fontSize:'11px', color:'#666' };
const pageCard = { margin:'20px', padding:'25px', background:'white', borderRadius:'8px' };
const odooTable = { width:'100%', borderCollapse:'collapse', marginTop:'15px' };
const odooInp = { width:'100%', padding:'10px', margin:'10px 0', border:'1px solid #ddd', borderRadius:'4px' };
const odooBtnPrimary = { width:'100%', padding:'12px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold' };
const purchaseFormBox = { maxWidth:'400px' };
const shortcutHint = { fontSize:'12px', background:'#714B67', padding:'5px 10px', borderRadius:'4px' };
