import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, Wallet, X, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchData();
    if (view === 'pos' || view === 'purchase') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render((text) => handleBarcodeSearch(text), (err) => {});
      return () => scanner.clear();
    }
  }, [view]);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: ex } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []); setExpenses(ex || []);
  }

  const handleBarcodeSearch = (code) => {
    const p = products.find(i => i.product_code === code);
    if (p) { addToCart(p, view === 'pos'); setSearch(''); }
  };

  const addToCart = (p, isSale) => {
    const target = isSale ? cart : purchaseCart;
    const setter = isSale ? setCart : setPurchaseCart;
    const exist = target.find(i => i.id === p.id);
    if (exist) setter(target.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    else setter([...target, { ...p, qty: 1 }]);
  };

  const handleFinalize = async () => {
    const isSale = view === 'pos';
    const currentCart = isSale ? cart : purchaseCart;
    if (currentCart.length === 0) return alert("စာရင်းရွေးပါဦး");

    const total = currentCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0);
    const profit = isSale ? total - currentCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
      total_amount: total,
      items_json: currentCart,
      profit: profit,
      device_name: currentCart.map(i => `${i.name} x${i.qty}`).join(', ')
    }]);

    if (!error) {
      for (const item of currentCart) {
        const newStock = isSale ? item.stock_quantity - item.qty : item.stock_quantity + item.qty;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      fetchData(); alert("သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  // --- နေ့စဉ်ဝင်ငွေ/ထွက်ငွေ တွက်ချက်ခြင်း ---
  const today = new Date().toLocaleDateString();
  const dailyIncome = orders.filter(o => new Date(o.created_at).toLocaleDateString() === today).reduce((a,b)=>a+Number(b.total_amount), 0);
  const dailyExpense = expenses.filter(e => new Date(e.created_at).toLocaleDateString() === today).reduce((a,b)=>a+Number(b.amount), 0);

  return (
    <div style={st.app}>
      <div style={st.sidebar}>
        <h2 style={st.brand}>Yadana</h2>
        <button onClick={()=>setView('pos')} style={view==='pos'?st.actTab:st.tab}><ShoppingCart/> POS</button>
        <button onClick={()=>setView('purchase')} style={view==='purchase'?st.actTab:st.tab}><Package/> Purchase</button>
        <button onClick={()=>setView('inventory')} style={view==='inventory'?st.actTab:st.tab}><Edit3/> Inventory</button>
        <button onClick={()=>setView('reports')} style={view==='reports'?st.actTab:st.tab}><BarChart3/> Cash Flow</button>
      </div>

      <div style={st.main}>
        <div style={st.header}>
            <div style={st.searchBar}><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={st.sInp}/></div>
            <div style={{display:'flex', gap:'20px'}}>
                <div style={st.headStat}><ArrowUpRight color="green"/> {dailyIncome.toLocaleString()} K</div>
                <div style={st.headStat}><ArrowDownLeft color="red"/> {dailyExpense.toLocaleString()} K</div>
            </div>
        </div>

        <div style={st.content}>
          {view === 'pos' || view === 'purchase' ? (
            <div style={st.posGrid}>
               <div style={{flex:1}}>
                  <div id="reader" style={st.scanner}></div>
                  <div style={st.pGrid}>
                    {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(
                      <div key={p.id} style={st.pCard} onClick={()=>addToCart(p, view==='pos')}>
                        <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K
                        <div style={st.stockLabel}>Stock: {p.stock_quantity}</div>
                      </div>
                    ))}
                  </div>
               </div>
               <div style={st.cartPanel}>
                  <h3>{view==='pos'?'အရောင်း':'အဝယ်'} စာရင်း</h3>
                  <div style={{flex:1, overflowY:'auto'}}>
                    {(view==='pos'?cart:purchaseCart).map(item=>(
                      <div key={item.id} style={st.cartRow}>
                        <span>{item.name} <b>x {item.qty}</b></span>
                        <span>{((view==='pos'?item.price:item.cost_price)*item.qty).toLocaleString()} K</span>
                      </div>
                    ))}
                  </div>
                  <div style={st.totalBox}>
                    <h2>Total: {(view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0).toLocaleString()} K</h2>
                    <button onClick={handleFinalize} style={st.saveBtn}>Confirm</button>
                  </div>
               </div>
            </div>
          ) : view === 'inventory' ? (
            <div style={st.glassPage}>
               <div style={st.flexRow}><h2>Inventory</h2><button onClick={()=>{setEditingProduct(null); setIsModalOpen(true)}} style={st.addBtn}>+ New Product</button></div>
               <table style={st.table}>
                  <thead><tr><th>Name</th><th>Sale</th><th>Cost</th><th>Stock</th><th>Action</th></tr></thead>
                  <tbody>{products.map(p=>(
                    <tr key={p.id}><td>{p.name}</td><td>{p.price}</td><td>{p.cost_price}</td><td>{p.stock_quantity}</td>
                    <td><Edit3 size={18} onClick={()=>{setEditingProduct(p); setIsModalOpen(true)}}/> <Trash2 size={18} color="red" onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('products').delete().eq('id',p.id); fetchData();}}}/></td></tr>
                  ))}</tbody>
               </table>
            </div>
          ) : (
            <div style={st.glassPage}>
               <h2>Daily Cash Flow (နေ့စဉ်စာရင်း)</h2>
               <div style={st.statRow}>
                  <div style={st.statBox}><h4>Today Income</h4><h3>{dailyIncome.toLocaleString()} K</h3></div>
                  <div style={st.statBox}><h4>Today Expense</h4><h3>{dailyExpense.toLocaleString()} K</h3></div>
                  <div style={st.statBox}><h4>Net Cash</h4><h3>{(dailyIncome-dailyExpense).toLocaleString()} K</h3></div>
               </div>
               <h3>Recent Transactions</h3>
               <table style={st.table}>
                  <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Action</th></tr></thead>
                  <tbody>{orders.map(o=>(
                    <tr key={o.id}><td>{new Date(o.created_at).toLocaleDateString()}</td><td style={{color:'green'}}>Income</td><td>{o.device_name}</td><td>{o.total_amount} K</td>
                    <td><Trash2 size={16} onClick={async()=>{if(window.confirm("ဘောင်ချာဖျက်မလား?")){await supabase.from('orders').delete().eq('id',o.id); fetchData();}}}/></td></tr>
                  ))}</tbody>
               </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={async(e)=>{
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                // Duplicate Check for NEW products only
                if(!editingProduct && products.some(p => p.product_code === d.product_code)) {
                    return alert("ဒီ Barcode က ရှိပြီးသားပါ။ ပစ္စည်းအသစ်ဆိုရင် Barcode အသစ် သုံးပေးပါ။");
                }
                if(editingProduct) await supabase.from('products').update(d).eq('id', editingProduct.id);
                else await supabase.from('products').insert([d]);
                setIsModalOpen(false); fetchData();
            }}>
                <input name="name" defaultValue={editingProduct?.name} placeholder="Name" style={st.inp} required/>
                <input name="price" defaultValue={editingProduct?.price} placeholder="Sale Price" style={st.inp} required/>
                <input name="cost_price" defaultValue={editingProduct?.cost_price} placeholder="Cost Price" style={st.inp} required/>
                <input name="stock_quantity" defaultValue={editingProduct?.stock_quantity} placeholder="Initial Stock" style={st.inp} required/>
                <input name="product_code" defaultValue={editingProduct?.product_code} placeholder="Barcode" style={st.inp} required/>
                <button type="submit" style={st.saveBtn}>Save</button>
                <button type="button" onClick={()=>setIsModalOpen(false)} style={st.cancelBtn}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  app: { display:'flex', height:'100vh', background:'#f8f9fa', fontFamily:'sans-serif' },
  sidebar: { width:'220px', background:'#212529', color:'white', padding:'20px' },
  brand: { fontSize:'24px', color:'#00d2d3', marginBottom:'30px' },
  tab: { display:'flex', gap:'10px', width:'100%', padding:'12px', background:'none', border:'none', color:'#adb5bd', cursor:'pointer', textAlign:'left' },
  actTab: { display:'flex', gap:'10px', width:'100%', padding:'12px', background:'#00d2d3', border:'none', color:'white', borderRadius:'8px', cursor:'pointer' },
  main: { flex:1, display:'flex', flexDirection:'column' },
  header: { background:'white', padding:'15px 30px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #dee2e6' },
  searchBar: { display:'flex', alignItems:'center', background:'#f1f3f5', padding:'8px 15px', borderRadius:'20px', width:'300px' },
  sInp: { border:'none', background:'none', outline:'none', marginLeft:'10px', width:'100%' },
  headStat: { background:'#f8f9fa', padding:'8px 15px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold' },
  content: { flex:1, padding:'25px', overflowY:'auto' },
  posGrid: { display:'flex', gap:'20px', height:'100%' },
  pGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'15px' },
  pCard: { background:'white', padding:'15px', borderRadius:'12px', textAlign:'center', cursor:'pointer', border:'1px solid #eee' },
  stockLabel: { fontSize:'11px', color:'#666', marginTop:'5px' },
  cartPanel: { width:'350px', background:'white', padding:'20px', borderRadius:'15px', display:'flex', flexDirection:'column', boxShadow:'0 4px 12px rgba(0,0,0,0.05)' },
  cartRow: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f8f9fa' },
  totalBox: { marginTop:'auto', paddingTop:'20px', borderTop:'2px solid #eee' },
  saveBtn: { width:'100%', padding:'12px', background:'#212529', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', marginTop:'10px' },
  glassPage: { background:'white', padding:'25px', borderRadius:'15px' },
  flexRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  addBtn: { padding:'10px 20px', background:'#00d2d3', color:'white', border:'none', borderRadius:'8px', cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse' },
  statRow: { display:'flex', gap:'20px', marginBottom:'30px' },
  statBox: { flex:1, background:'#f8f9fa', padding:'20px', borderRadius:'12px', textAlign:'center' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center' },
  modal: { background:'white', padding:'30px', borderRadius:'15px', width:'350px' },
  inp: { width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box' },
  cancelBtn: { width:'100%', padding:'10px', background:'#eee', border:'none', borderRadius:'8px', marginTop:'5px', cursor:'pointer' },
  scanner: { width:'100%', maxWidth:'300px', borderRadius:'10px', overflow:'hidden', marginBottom:'20px' }
};
