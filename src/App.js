import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, CreditCard, LayoutDashboard, Settings, X 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    // Font ကို Dynamic ချိတ်ဆက်ခြင်း
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []);
  }

  // --- Search & Enter Key Logic ---
  const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      const match = products.find(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.product_code === search);
      if (match) {
        addToCart(match, view === 'pos');
        setSearch('');
      }
    }
  };

  const addToCart = (p, isSale) => {
    const set = isSale ? setCart : setPurchaseCart;
    const items = isSale ? cart : purchaseCart;
    const exist = items.find(i => i.id === p.id);
    if (exist) set(items.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    else set([...items, { ...p, qty: 1 }]);
  };

  // --- Reports Calculation ---
  const thisMonthSales = orders
    .filter(o => new Date(o.created_at).getMonth() === new Date().getMonth())
    .reduce((a, b) => a + Number(b.total_amount), 0);

  const totalStockValue = products.reduce((a, b) => a + (b.cost_price * b.stock_quantity), 0);

  return (
    <div style={st.app}>
      {/* Sidebar Navigation */}
      <div style={st.sidebar}>
        <div style={st.brand}>Yadana</div>
        <button onClick={()=>setView('pos')} style={view==='pos'?st.actTab:st.tab}><ShoppingCart size={20}/> POS</button>
        <button onClick={()=>setView('purchase')} style={view==='purchase'?st.actTab:st.tab}><CreditCard size={20}/> Purchase</button>
        <button onClick={()=>setView('inventory')} style={view==='inventory'?st.actTab:st.tab}><Package size={20}/> Inventory</button>
        <button onClick={()=>setView('reports')} style={view==='reports'?st.actTab:st.tab}><BarChart3 size={20}/> Analytics</button>
      </div>

      <div style={st.content}>
        {/* Top Header */}
        <div style={st.header}>
          <div style={st.searchBar}>
            <Search size={18} color="#999"/>
            <input 
              placeholder="Search or Scan... (Enter to select)" 
              value={search} 
              onKeyDown={handleEnterKey}
              onChange={e=>setSearch(e.target.value)} 
              style={st.sInp}
            />
          </div>
          <div style={st.userProfile}>Yadana Admin</div>
        </div>

        {/* --- POS View --- */}
        {(view === 'pos' || view === 'purchase') && (
          <div style={st.mainGrid}>
            <div style={st.productGrid}>
              {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(
                <div key={p.id} style={st.pCard} onClick={()=>addToCart(p, view==='pos')}>
                  <div style={st.stockTag}>{p.stock_quantity}</div>
                  <div style={st.pName}>{p.name}</div>
                  <div style={st.pPrice}>{view==='pos'?p.price:p.cost_price} K</div>
                </div>
              ))}
            </div>
            <div style={st.cartPanel}>
              <h3 style={{margin:'0 0 20px 0'}}>{view==='pos'?'Current Sale':'Restock List'}</h3>
              <div style={st.cartItems}>
                {(view==='pos'?cart:purchaseCart).map(item=>(
                  <div key={item.id} style={st.cartRow}>
                    <span>{item.name} x{item.qty}</span>
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                      <b>{( (view==='pos'?item.price:item.cost_price) * item.qty).toLocaleString()}</b>
                      <Trash2 size={16} color="#ff4d4d" onClick={()=>{
                        const s = view==='pos'?setCart : setPurchaseCart;
                        s((view==='pos'?cart:purchaseCart).filter(i=>i.id!==item.id));
                      }} style={{cursor:'pointer'}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={st.cartFooter}>
                 <div style={st.totalRow}><span>Subtotal</span><span>{(view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0).toLocaleString()} K</span></div>
                 <button style={st.payBtn}>Complete {view==='pos'?'Sale':'Purchase'}</button>
              </div>
            </div>
          </div>
        )}

        {/* --- Inventory View (Manage Stock) --- */}
        {view === 'inventory' && (
          <div style={st.glassPage}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
              <h2>Stock Inventory</h2>
              <button onClick={()=>{setEditingProduct(null); setIsModalOpen(true)}} style={st.addBtn}>+ Add Product</button>
            </div>
            <table style={st.table}>
              <thead>
                <tr><th>Product</th><th>Sales Price</th><th>Cost</th><th>Stock</th><th>Action</th></tr>
              </thead>
              <tbody>
                {products.map(p=>(
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td>{p.price} K</td>
                    <td>{p.cost_price} K</td>
                    <td><span style={p.stock_quantity < 5 ? st.lowStock : st.okStock}>{p.stock_quantity}</span></td>
                    <td>
                      <Edit3 size={18} style={st.iconEdit} onClick={()=>{setEditingProduct(p); setIsModalOpen(true)}}/>
                      <Trash2 size={18} style={st.iconDel} onClick={async()=>{if(window.confirm("Delete this product?")) {await supabase.from('products').delete().eq('id',p.id); fetchData();}}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Analytics View (Monthly Sales) --- */}
        {view === 'reports' && (
          <div style={st.glassPage}>
            <h2>Business Analytics</h2>
            <div style={st.statRow}>
              <div style={st.statBox}><h4>Monthly Revenue</h4><h2>{thisMonthSales.toLocaleString()} K</h2></div>
              <div style={st.statBox}><h4>Stock Valuation</h4><h2>{totalStockValue.toLocaleString()} K</h2></div>
              <div style={st.statBox}><h4>Active Products</h4><h2>{products.length}</h2></div>
            </div>
            
            <h3 style={{marginTop:'40px'}}>Recent Transactions</h3>
            <table style={st.table}>
               <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
               <tbody>{orders.slice(0,10).map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.device_name}</td><td>{o.total_amount} K</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div style={st.overlay}>
          <div style={st.modal}>
             <h3>{editingProduct ? 'Edit Product' : 'New Product'}</h3>
             <form onSubmit={async(e)=>{
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                if(editingProduct) await supabase.from('products').update(d).eq('id', editingProduct.id);
                else await supabase.from('products').insert([d]);
                setIsModalOpen(false); fetchData();
             }}>
               <input name="name" placeholder="Product Name" defaultValue={editingProduct?.name} style={st.inp} required/>
               <input name="price" type="number" placeholder="Sales Price" defaultValue={editingProduct?.price} style={st.inp} required/>
               <input name="cost_price" type="number" placeholder="Cost Price" defaultValue={editingProduct?.cost_price} style={st.inp} required/>
               <input name="stock_quantity" type="number" placeholder="Current Stock" defaultValue={editingProduct?.stock_quantity} style={st.inp} required/>
               <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                 <button type="submit" style={st.saveBtn}>Save Product</button>
                 <button type="button" onClick={()=>setIsModalOpen(false)} style={st.cancelBtn}>Cancel</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  app: { display:'flex', height:'100vh', background:'#f0f4f8', fontFamily:'"Poppins", sans-serif', color:'#2d3436' },
  sidebar: { width:'240px', background:'#2d3436', color:'white', padding:'30px 20px', display:'flex', flexDirection:'column', gap:'10px' },
  brand: { fontSize:'28px', fontWeight:'bold', marginBottom:'40px', color:'#00d2d3', textAlign:'center', letterSpacing:'2px' },
  tab: { display:'flex', alignItems:'center', gap:'15px', padding:'15px', background:'none', border:'none', color:'#b2bec3', cursor:'pointer', borderRadius:'12px', transition:'0.3s', fontSize:'16px' },
  actTab: { display:'flex', alignItems:'center', gap:'15px', padding:'15px', background:'#00d2d3', border:'none', color:'white', cursor:'pointer', borderRadius:'12px', fontWeight:'600' },
  content: { flex:1, padding:'30px', display:'flex', flexDirection:'column', gap:'25px', overflowY:'auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  searchBar: { display:'flex', alignItems:'center', background:'white', padding:'12px 25px', borderRadius:'15px', width:'400px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)' },
  sInp: { border:'none', outline:'none', marginLeft:'15px', width:'100%', fontSize:'14px' },
  mainGrid: { display:'flex', gap:'25px', height:'100%' },
  productGrid: { flex:1, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'20px', overflowY:'auto' },
  pCard: { background:'white', padding:'20px', borderRadius:'20px', textAlign:'center', cursor:'pointer', transition:'0.3s', boxShadow:'0 4px 6px rgba(0,0,0,0.02)', position:'relative' },
  stockTag: { position:'absolute', top:'10px', right:'10px', background:'#dfe6e9', padding:'2px 8px', borderRadius:'10px', fontSize:'11px' },
  pName: { fontWeight:'600', marginBottom:'10px', fontSize:'15px' },
  pPrice: { color:'#00d2d3', fontWeight:'bold' },
  cartPanel: { width:'380px', background:'white', borderRadius:'25px', padding:'30px', display:'flex', flexDirection:'column', boxShadow:'0 10px 30px rgba(0,0,0,0.05)' },
  cartItems: { flex:1, overflowY:'auto' },
  cartRow: { display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f2f6', fontSize:'14px' },
  cartFooter: { marginTop:'20px' },
  totalRow: { display:'flex', justifyContent:'space-between', fontSize:'20px', fontWeight:'bold', marginBottom:'20px' },
  payBtn: { width:'100%', padding:'18px', background:'#2d3436', color:'white', border:'none', borderRadius:'15px', fontWeight:'bold', cursor:'pointer' },
  glassPage: { background:'rgba(255, 255, 255, 0.7)', backdropFilter:'blur(10px)', padding:'30px', borderRadius:'25px', boxShadow:'0 10px 30px rgba(0,0,0,0.03)' },
  table: { width:'100%', borderCollapse:'collapse', textAlign:'left' },
  lowStock: { color:'#ff7675', fontWeight:'bold', background:'#fff5f5', padding:'4px 10px', borderRadius:'8px' },
  okStock: { color:'#55efc4', fontWeight:'bold' },
  statRow: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'25px', marginBottom:'40px' },
  statBox: { background:'white', padding:'30px', borderRadius:'20px', textAlign:'center', boxShadow:'0 4px 15px rgba(0,0,0,0.02)' },
  addBtn: { padding:'12px 25px', background:'#00d2d3', color:'white', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:'bold' },
  iconEdit: { cursor:'pointer', color:'#0984e3' },
  iconDel: { cursor:'pointer', color:'#ff7675', marginLeft:'15px' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(5px)', display:'flex', justifyContent:'center', alignItems:'center' },
  modal: { background:'white', padding:'40px', borderRadius:'25px', width:'400px' },
  inp: { width:'100%', padding:'15px', marginBottom:'15px', borderRadius:'12px', border:'1px solid #dfe6e9', boxSizing:'border-box' },
  saveBtn: { flex:1, padding:'15px', background:'#00d2d3', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold' },
  cancelBtn: { flex:1, padding:'15px', background:'#dfe6e9', border:'none', borderRadius:'12px' }
};
