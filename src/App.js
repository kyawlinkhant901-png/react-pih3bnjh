import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, CreditCard, Wallet, Calendar, ScanBarcode, X 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');

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
    const { data: ex } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []); setExpenses(ex || []);
  }

  // --- Cart Management (Sale & Purchase) ---
  const updateCartQty = (id, amount, isSale = true) => {
    const targetCart = isSale ? cart : purchaseCart;
    const setTargetCart = isSale ? setCart : setPurchaseCart;
    
    setTargetCart(targetCart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + amount);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id, isSale = true) => {
    isSale ? setCart(cart.filter(i => i.id !== id)) : setPurchaseCart(purchaseCart.filter(i => i.id !== id));
  };

  // --- Checkout Logics ---
  const handleCheckout = async (isSale = true) => {
    const targetCart = isSale ? cart : purchaseCart;
    if (targetCart.length === 0) return;

    const total = targetCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0);
    const profit = isSale ? total - targetCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const table = isSale ? 'orders' : 'purchase_orders';
    const rpc = isSale ? 'handle_checkout' : 'handle_purchase';
    const qtyParam = isSale ? 'quantity_to_subtract' : 'quantity_to_add';

    const { error } = await supabase.from(table).insert([{ 
      total_amount: total, 
      device_name: targetCart.map(i => `${i.name} x${i.qty}`).join(', '),
      profit, 
      items_json: targetCart 
    }]);

    if (!error) {
      for (const item of targetCart) {
        await supabase.rpc(rpc, { p_id: item.id, [qtyParam]: item.qty });
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      fetchData(); alert("သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  // --- Reports Logic ---
  const dailySales = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const dailyTotal = dailySales.reduce((a, b) => a + Number(b.total_amount), 0);
  const dailyProfit = dailySales.reduce((a, b) => a + Number(b.profit), 0);
  const totalExpense = expenses.reduce((a, b) => a + Number(b.amount), 0);

  return (
    <div style={odooContainer}>
      <div style={odooNavbar}>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={()=>setView('pos')} style={view==='pos'?activeNav:navBtn}>F1 POS</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?activeNav:navBtn}>F2 Purchase</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?activeNav:navBtn}>F3 Stock</button>
          <button onClick={()=>setView('accounting')} style={view==='accounting'?activeNav:navBtn}>F4 Expense</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?activeNav:navBtn}>F5 Reports</button>
        </div>
      </div>

      <div style={mainBody}>
        {/* --- POS/Purchase Layout --- */}
        {(view === 'pos' || view === 'purchase') && (
          <div style={posLayout}>
            <div style={cartPanel}>
              <div style={cartHeader}>{view === 'pos' ? 'အရောင်းဘောင်ချာ' : 'အဝယ်ဘောင်ချာ'}</div>
              <div style={cartItems}>
                {(view === 'pos' ? cart : purchaseCart).map((item) => (
                  <div key={item.id} style={cartRow}>
                    <div style={{flex:1}}><b>{item.name}</b><br/>{view === 'pos' ? item.price : item.cost_price} K</div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <Minus size={16} onClick={()=>updateCartQty(item.id, -1, view==='pos')} style={iconBtn}/>
                      <b>{item.qty}</b>
                      <Plus size={16} onClick={()=>updateCartQty(item.id, 1, view==='pos')} style={iconBtn}/>
                      <Trash2 size={16} color="red" onClick={()=>removeFromCart(item.id, view==='pos')} style={iconBtn}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={cartFooter}>
                <div style={totalLine}>Total: {(view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0).toLocaleString()} K</div>
                <button onClick={()=>handleCheckout(view==='pos')} style={payBtn}>အတည်ပြုမည်</button>
              </div>
            </div>
            <div style={productArea}>
              <div style={searchBar}><Search size={18}/><input placeholder="ပစ္စည်းရှာရန်..." onChange={e=>setSearch(e.target.value)} style={searchInp}/></div>
              <div style={grid}>
                {products.filter(p=>p.name.includes(search)).map(p=>(
                  <div key={p.id} onClick={()=>{
                    const cartSet = view==='pos'?cart:purchaseCart;
                    const setter = view==='pos'?setCart:setPurchaseCart;
                    const exist = cartSet.find(i=>i.id===p.id);
                    if(exist) updateCartQty(p.id, 1, view==='pos');
                    else setter([...cartSet, {...p, qty: 1}]);
                  }} style={pCard}>
                    <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K<br/><small>Stock: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- Inventory View --- */}
        {view === 'inventory' && (
          <div style={pageContent}>
            <h3>စတော့လက်ကျန် စီမံခြင်း</h3>
            <table style={odooTable}>
              <thead><tr><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>လက်ကျန်</th><th>ပြင်/ဖျက်</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.price}</td><td>{p.cost_price}</td><td>{p.stock_quantity}</td>
                    <td><Edit3 size={16} style={iconBtn}/><Trash2 size={16} color="red" style={iconBtn}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Reports View --- */}
        {view === 'reports' && (
          <div style={pageContent}>
            <div style={reportGrid}>
              <div style={statBox}><h4>ယနေ့ရောင်းအား</h4><h2>{dailyTotal.toLocaleString()} K</h2></div>
              <div style={statBox}><h4>ယနေ့အမြတ်</h4><h2>{dailyProfit.toLocaleString()} K</h2></div>
              <div style={statBox}><h4>စုစုပေါင်းအသုံးစရိတ်</h4><h2>{totalExpense.toLocaleString()} K</h2></div>
              <div style={statBox}><h4>အသားတင်အမြတ်</h4><h2>{(dailyProfit - totalExpense).toLocaleString()} K</h2></div>
            </div>
            <h4>အရောင်းမှတ်တမ်း (ဘောင်ချာဖျက်ပါက စတော့ပြန်တိုးမည်)</h4>
            <table style={odooTable}>
              <thead><tr><th>နေ့စွဲ</th><th>အသေးစိတ်</th><th>ပမာဏ</th><th>အမြတ်</th><th>ဖျက်ရန်</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>{o.device_name}</td><td>{o.total_amount} K</td><td>{o.profit} K</td>
                    <td><Trash2 size={16} color="red" onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('orders').delete().eq('id', o.id); await supabase.rpc('handle_order_delete', {p_items_json: o.items_json}); fetchData();}}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const odooContainer = { height:'100vh', display:'flex', flexDirection:'column', background:'#F0F2F5', fontFamily:'sans-serif' };
const odooNavbar = { background:'#875A7B', color:'white', padding:'10px 20px', display:'flex', gap:'20px' };
const navBtn = { background:'none', border:'none', color:'#eee', padding:'10px 15px', cursor:'pointer' };
const activeNav = { ...navBtn, background:'#714B67', borderRadius:'4px', color:'white', fontWeight:'bold' };
const mainBody = { flex:1, overflow:'hidden' };
const posLayout = { display:'flex', height:'100%' };
const cartPanel = { width:'400px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' };
const cartHeader = { padding:'15px', background:'#e9ecef', fontWeight:'bold', textAlign:'center' };
const cartItems = { flex:1, overflowY:'auto', padding:'15px' };
const cartRow = { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' };
const cartFooter = { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' };
const totalLine = { fontSize:'22px', fontWeight:'bold', color:'#875A7B', marginBottom:'15px', textAlign:'center' };
const payBtn = { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer' };
const productArea = { flex:1, padding:'20px', overflowY:'auto' };
const searchBar = { display:'flex', alignItems:'center', background:'white', padding:'10px 15px', borderRadius:'25px', marginBottom:'20px', border:'1px solid #ddd' };
const searchInp = { border:'none', outline:'none', marginLeft:'10px', width:'100%' };
const grid = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' };
const pCard = { background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer' };
const pageContent = { padding:'30px', overflowY:'auto', height:'100%' };
const odooTable = { width:'100%', borderCollapse:'collapse', marginTop:'15px', background:'white' };
const iconBtn = { cursor:'pointer' };
const reportGrid = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'15px', marginBottom:'30px' };
const statBox = { background:'white', padding:'20px', borderRadius:'8px', textAlign:'center', borderLeft:'5px solid #875A7B', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' };
