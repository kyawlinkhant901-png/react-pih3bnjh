import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, Camera, Wallet, X, CheckCircle, LayoutDashboard
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchData();
    // Font setup
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Barcode Scanner Setup (Phone Camera Ready)
    if (view === 'pos' || view === 'purchase') {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: 250,
        videoConstraints: { facingMode: "environment" } 
      });
      scanner.render((text) => {
        handleBarcodeSearch(text);
      }, (err) => {});
      return () => scanner.clear();
    }
  }, [view]);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: ex } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []); setExpenses(ex || []);
  }

  // --- Search & Barcode ---
  const handleBarcodeSearch = (code) => {
    const p = products.find(i => i.product_code === code);
    if (p) {
      addToCart(p, view === 'pos');
      setSearch('');
    }
  };

  const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      const match = products.find(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.product_code === search);
      if (match) {
        addToCart(match, view === 'pos');
        setSearch('');
      }
    }
  };

  // --- Cart Logic ---
  const addToCart = (p, isSale) => {
    const target = isSale ? cart : purchaseCart;
    const setter = isSale ? setCart : setPurchaseCart;

    if (!isSale && products.some(item => item.product_code === p.product_code)) {
      if (!window.confirm("ဒီပစ္စည်းက စာရင်းထဲမှာ ရှိပြီးသားပါ။ အဝယ်စာရင်းထဲ ထပ်ပေါင်းထည့်မှာလား?")) return;
    }

    const exist = target.find(i => i.id === p.id);
    if (exist) setter(target.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    else setter([...target, { ...p, qty: 1 }]);
  };

  // --- Save Function (Finalize) ---
  const handleFinalize = async () => {
    const isSale = view === 'pos';
    const targetCart = isSale ? cart : purchaseCart;
    if (targetCart.length === 0) return alert("ပစ္စည်းရွေးပါဦး");

    const subtotal = targetCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0);
    const total = subtotal * (1 - discount/100);
    const profit = isSale ? total - targetCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
      total_amount: total,
      items_json: targetCart,
      profit: profit,
      device_name: targetCart.map(i => `${i.name} x${i.qty}`).join(', ')
    }]);

    if (!error) {
      for (const item of targetCart) {
        const newStock = isSale ? item.stock_quantity - item.qty : item.stock_quantity + item.qty;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      setDiscount(0); fetchData();
      alert("အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  // --- Analytics Data ---
  const thisMonthSales = orders.filter(o => new Date(o.created_at).getMonth() === new Date().getMonth()).reduce((a, b) => a + Number(b.total_amount), 0);
  const totalExpenses = expenses.reduce((a, b) => a + Number(b.amount), 0);

  return (
    <div style={st.app}>
      <div style={st.sidebar}>
        <div style={st.brand}>Yadana</div>
        <button onClick={()=>setView('pos')} style={view==='pos'?st.actTab:st.tab}><ShoppingCart size={20}/> POS</button>
        <button onClick={()=>setView('purchase')} style={view==='purchase'?st.actTab:st.tab}><Package size={20}/> Purchase</button>
        <button onClick={()=>setView('inventory')} style={view==='inventory'?st.actTab:st.tab}><Edit3 size={20}/> Inventory</button>
        <button onClick={()=>setView('expenses')} style={view==='expenses'?st.actTab:st.tab}><Wallet size={20}/> Expenses</button>
        <button onClick={()=>setView('reports')} style={view==='reports'?st.actTab:st.tab}><BarChart3 size={20}/> Analytics</button>
      </div>

      <div style={st.main}>
        <div style={st.header}>
          <div style={st.searchBar}>
            <Search size={18} color="#999"/>
            <input value={search} onKeyDown={handleEnterKey} onChange={e=>setSearch(e.target.value)} placeholder="Search or Scan... (Enter to select)" style={st.sInp}/>
          </div>
          <div style={st.userProfile}>Yadana Admin</div>
        </div>

        <div style={st.content}>
          {(view === 'pos' || view === 'purchase') && (
            <div style={st.posLayout}>
              <div style={st.prodSide}>
                <div id="reader" style={{width:'100%', maxWidth:'300px', borderRadius:'15px', marginBottom:'20px', overflow:'hidden'}}></div>
                <div style={st.prodGrid}>
                  {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(
                    <div key={p.id} style={st.pCard} onClick={()=>addToCart(p, view==='pos')}>
                      <div style={st.stockTag}>{p.stock_quantity}</div>
                      <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K
                    </div>
                  ))}
                </div>
              </div>
              <div style={st.cartPanel}>
                <h3>{view==='pos'?'Sale Cart':'Purchase Cart'}</h3>
                <div style={st.cartItems}>
                  {(view==='pos'?cart:purchaseCart).map(item=>(
                    <div key={item.id} style={st.cartRow}>
                      <span>{item.name} x{item.qty}</span>
                      <Trash2 size={16} color="red" style={{cursor:'pointer'}} onClick={()=>(view==='pos'?setCart(cart.filter(i=>i.id!==item.id)):setPurchaseCart(purchaseCart.filter(i=>i.id!==item.id)))}/>
                    </div>
                  ))}
                </div>
                <div style={st.cartFooter}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'14px'}}>
                    <span>Discount %</span>
                    <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} style={{width:'50px'}}/>
                  </div>
                  <h2 style={{margin:'15px 0'}}>Net: {( (view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0) * (1-discount/100) ).toLocaleString()} K</h2>
                  <button onClick={handleFinalize} style={st.payBtn}>Confirm {view==='pos'?'Sale':'Purchase'}</button>
                </div>
              </div>
            </div>
          )}

          {view === 'inventory' && (
            <div style={st.glassPage}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h2>Inventory Management</h2>
                <button onClick={()=>{setEditingProduct(null); setIsModalOpen(true)}} style={st.addBtn}>+ Add Product</button>
              </div>
              <table style={st.table}>
                <thead><tr><th>Name</th><th>Price</th><th>Cost</th><th>Stock</th><th>Action</th></tr></thead>
                <tbody>
                  {products.map(p=>(
                    <tr key={p.id}>
                      <td>{p.name}</td><td>{p.price} K</td><td>{p.cost_price} K</td><td>{p.stock_quantity}</td>
                      <td>
                        <Edit3 size={18} style={{marginRight:'10px', cursor:'pointer', color:'blue'}} onClick={()=>{setEditingProduct(p); setIsModalOpen(true)}}/>
                        <Trash2 size={18} style={{cursor:'pointer', color:'red'}} onClick={async()=>{if(window.confirm("Delete?")){await supabase.from('products').delete().eq('id',p.id); fetchData();}}}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'expenses' && (
            <div style={st.glassPage}>
              <h2>Shop Expenses</h2>
              <button onClick={async()=>{
                const title = prompt("Expense Title:");
                const amount = prompt("Amount:");
                if(title && amount) { await supabase.from('expenses').insert([{title, amount}]); fetchData(); }
              }} style={st.addBtn}>+ Add Expense</button>
              <table style={st.table}>
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
                <tbody>{expenses.map(ex=><tr key={ex.id}><td>{new Date(ex.created_at).toLocaleDateString()}</td><td>{ex.title}</td><td>{ex.amount} K</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {view === 'reports' && (
            <div style={st.glassPage}>
              <div style={st.statRow}>
                <div style={st.statBox}><h4>Monthly Sales</h4><h2>{thisMonthSales.toLocaleString()} K</h2></div>
                <div style={st.statBox}><h4>Total Expenses</h4><h2>{totalExpenses.toLocaleString()} K</h2></div>
              </div>
              <h3>Transaction History</h3>
              <table style={st.table}>
                <thead><tr><th>Date</th><th>Items</th><th>Total</th><th>Action</th></tr></thead>
                <tbody>
                  {orders.map(o=>(
                    <tr key={o.id}>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.device_name}</td><td>{o.total_amount} K</td>
                      <td><Trash2 size={18} color="red" onClick={async()=>{if(window.confirm("Delete voucher?")){await supabase.from('orders').delete().eq('id',o.id); fetchData();}}}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <h3>{editingProduct ? 'Edit' : 'New'} Product</h3>
            <form onSubmit={async(e)=>{
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.target));
              if(editingProduct) await supabase.from('products').update(d).eq('id', editingProduct.id);
              else await supabase.from('products').insert([d]);
              setIsModalOpen(false); fetchData();
            }}>
              <input name="name" defaultValue={editingProduct?.name} placeholder="Name" style={st.inp} required/>
              <input name="price" defaultValue={editingProduct?.price} placeholder="Sales Price" style={st.inp} required/>
              <input name="cost_price" defaultValue={editingProduct?.cost_price} placeholder="Cost" style={st.inp} required/>
              <input name="stock_quantity" defaultValue={editingProduct?.stock_quantity} placeholder="Stock" style={st.inp} required/>
              <input name="product_code" defaultValue={editingProduct?.product_code} placeholder="Barcode" style={st.inp}/>
              <button type="submit" style={st.saveBtn}>Save</button>
              <button onClick={()=>setIsModalOpen(false)} style={st.cancelBtn}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  app: { display:'flex', height:'100vh', background:'#f0f4f8', fontFamily:'Poppins, sans-serif' },
  sidebar: { width:'240px', background:'#2d3436', color:'white', padding:'30px 20px', display:'flex', flexDirection:'column', gap:'10px' },
  brand: { fontSize:'28px', fontWeight:'bold', marginBottom:'40px', color:'#00d2d3', textAlign:'center' },
  tab: { display:'flex', alignItems:'center', gap:'15px', padding:'15px', background:'none', border:'none', color:'#b2bec3', cursor:'pointer', borderRadius:'12px', fontSize:'16px' },
  actTab: { display:'flex', alignItems:'center', gap:'15px', padding:'15px', background:'#00d2d3', border:'none', color:'white', cursor:'pointer', borderRadius:'12px', fontWeight:'600' },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  header: { display:'flex', justifyContent:'space-between', padding:'20px 30px', background:'white' },
  searchBar: { display:'flex', alignItems:'center', background:'#f0f4f8', padding:'10px 20px', borderRadius:'15px', width:'400px' },
  sInp: { border:'none', background:'none', outline:'none', marginLeft:'15px', width:'100%' },
  content: { flex:1, padding:'30px', overflowY:'auto' },
  posLayout: { display:'flex', gap:'25px', height:'100%' },
  prodSide: { flex:1 },
  prodGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'15px' },
  pCard: { background:'white', padding:'20px', borderRadius:'20px', textAlign:'center', cursor:'pointer', position:'relative', boxShadow:'0 4px 6px rgba(0,0,0,0.02)' },
  stockTag: { position:'absolute', top:'10px', right:'10px', background:'#eee', fontSize:'10px', padding:'2px 5px', borderRadius:'5px' },
  cartPanel: { width:'380px', background:'white', borderRadius:'25px', padding:'25px', display:'flex', flexDirection:'column' },
  cartItems: { flex:1, overflowY:'auto' },
  cartRow: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' },
  cartFooter: { marginTop:'20px', borderTop:'2px solid #eee', paddingTop:'20px' },
  payBtn: { width:'100%', padding:'15px', background:'#2d3436', color:'white', border:'none', borderRadius:'15px', fontWeight:'bold', cursor:'pointer' },
  glassPage: { background:'white', padding:'30px', borderRadius:'25px' },
  table: { width:'100%', borderCollapse:'collapse', marginTop:'15px' },
  statRow: { display:'flex', gap:'20px', marginBottom:'30px' },
  statBox: { flex:1, background:'#f9f9f9', padding:'25px', borderRadius:'20px', textAlign:'center' },
  addBtn: { padding:'10px 20px', background:'#00d2d3', color:'white', border:'none', borderRadius:'10px', cursor:'pointer' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 },
  modal: { background:'white', padding:'40px', borderRadius:'25px', width:'400px' },
  inp: { width:'100%', padding:'12px', marginBottom:'10px', borderRadius:'10px', border:'1px solid #ddd' },
  saveBtn: { width:'100%', padding:'12px', background:'#00d2d3', color:'white', border:'none', borderRadius:'10px', marginBottom:'5px' },
  cancelBtn: { width:'100%', padding:'12px', background:'#eee', border:'none', borderRadius:'10px' }
};
