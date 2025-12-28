import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, CreditCard, Wallet, Save, X, ScanBarcode } from 'lucide-react';

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
    const handleShortcuts = (e) => {
      if (e.key === 'F1') setView('pos');
      if (e.key === 'F2') setView('purchase');
      if (e.key === 'F3') setView('inventory');
      if (e.key === 'F4') setView('reports');
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: ex } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
    setExpenses(ex || []);
  }

  // --- ပစ္စည်းအသစ်ထည့်ခြင်း/ပြင်ခြင်း (မပျောက်စေရ) ---
  const saveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = Object.fromEntries(formData.entries());

    if (editingProduct) {
      await supabase.from('products').update(productData).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([productData]);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    fetchData(); // ချက်ချင်းပြန်ခေါ်ပြီး စာရင်း Update လုပ်မယ်
  };

  // --- အရောင်း/အဝယ် သိမ်းဆည်းခြင်း ---
  const handleCheckout = async (isSale) => {
    const targetCart = isSale ? cart : purchaseCart;
    if (targetCart.length === 0) return;

    const total = targetCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0);
    const profit = isSale ? total - targetCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
      total_amount: total, profit, items_json: targetCart
    }]);

    if (!error) {
      for (const item of targetCart) {
        const newStock = isSale ? Number(item.stock_quantity) - item.qty : Number(item.stock_quantity) + item.qty;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      fetchData();
      alert("အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.nav}>
        <div style={styles.navLinks}>
          <b style={{fontSize:'1.2rem'}}>MASTER POS PRO</b>
          <button onClick={()=>setView('pos')} style={view==='pos'?styles.activeBtn:styles.navBtn}>F1 အရောင်း</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?styles.activeBtn:styles.navBtn}>F2 အဝယ်</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?styles.activeBtn:styles.navBtn}>F3 စတော့</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?styles.activeBtn:styles.navBtn}>F4 Reports</button>
        </div>
      </div>

      <div style={styles.main}>
        {/* --- POS Layout (အရောင်းနှင့် အဝယ်) --- */}
        {(view === 'pos' || view === 'purchase') && (
          <div style={styles.posGrid}>
            <div style={styles.cartSide}>
              <div style={styles.cartTitle}>{view==='pos'?'အရောင်းဘောင်ချာ':'အဝယ်ဘောင်ချာ'}</div>
              <div style={styles.cartList}>
                {(view==='pos'?cart:purchaseCart).map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <div style={{flex:1}}><b>{item.name}</b><br/><small>{view==='pos'?item.price:item.cost_price} K</small></div>
                    <div style={styles.qtyBox}>
                      <Minus size={18} style={styles.ptr} onClick={()=>{
                        const set = view==='pos'?setCart:setPurchaseCart;
                        const c = view==='pos'?cart:purchaseCart;
                        set(c.map(i=>i.id===item.id?{...i, qty:Math.max(1, i.qty-1)}:i));
                      }}/>
                      <b>{item.qty}</b>
                      <Plus size={18} style={styles.ptr} onClick={()=>{
                        const set = view==='pos'?setCart:setPurchaseCart;
                        const c = view==='pos'?cart:purchaseCart;
                        set(c.map(i=>i.id===item.id?{...i, qty:i.qty+1}:i));
                      }}/>
                      <Trash2 size={18} color="red" style={styles.ptr} onClick={()=>{
                        const set = view==='pos'?setCart:setPurchaseCart;
                        const c = view==='pos'?cart:purchaseCart;
                        set(c.filter(i=>i.id!==item.id));
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.cartFooter}>
                <div style={styles.total}>Total: {(view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0).toLocaleString()} K</div>
                <button style={styles.chkBtn} onClick={()=>handleCheckout(view==='pos')}>သိမ်းမည် (Save)</button>
              </div>
            </div>

            <div style={styles.prodSide}>
              <div style={styles.searchBar}><ScanBarcode size={20}/><input placeholder="ပစ္စည်းရှာရန်..." onChange={e=>setSearch(e.target.value)} style={styles.sInp}/></div>
              <div style={styles.grid}>
                {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(
                  <div key={p.id} style={styles.pCard} onClick={()=>{
                    const target = view==='pos'?cart:purchaseCart;
                    const setter = view==='pos'?setCart:setPurchaseCart;
                    const exist = target.find(i=>i.id===p.id);
                    if(exist) setter(target.map(i=>i.id===p.id?{...i, qty:i.qty+1}:i));
                    else setter([...target, {...p, qty: 1}]);
                  }}>
                    <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K<br/><small>Stock: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- Inventory View (ပစ္စည်းအသစ်ထည့်ရန်) --- */}
        {view === 'inventory' && (
          <div style={styles.page}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h3>ပစ္စည်းစာရင်း</h3>
              <button onClick={()=>{setEditingProduct(null); setIsModalOpen(true)}} style={styles.addBtn}>+ ပစ္စည်းအသစ်ထည့်ရန်</button>
            </div>
            <table style={styles.table}>
              <thead><tr><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>လက်ကျန်</th><th>ပြင်/ဖျက်</th></tr></thead>
              <tbody>
                {products.map(p=>(
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.price}</td><td>{p.cost_price}</td><td>{p.stock_quantity}</td>
                    <td>
                      <Edit3 size={18} style={styles.ptr} onClick={()=>{setEditingProduct(p); setIsModalOpen(true)}}/>
                      <Trash2 size={18} color="red" style={{...styles.ptr, marginLeft:'15px'}} onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('products').delete().eq('id',p.id); fetchData();}}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Reports View --- */}
        {view === 'reports' && (
          <div style={styles.page}>
            <div style={styles.repGrid}>
              <div style={styles.stat}><h4>ယနေ့ရောင်းအား</h4><h2>{orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).reduce((a,b)=>a+Number(b.total_amount),0).toLocaleString()} K</h2></div>
              <div style={styles.stat}><h4>ယနေ့အမြတ်</h4><h2>{orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).reduce((a,b)=>a+Number(b.profit),0).toLocaleString()} K</h2></div>
            </div>
            <table style={styles.table}>
              <thead><tr><th>နေ့စွဲ</th><th>အသေးစိတ်</th><th>ရောင်းရငွေ</th><th>အမြတ်</th><th>ဖျက်ရန်</th></tr></thead>
              <tbody>
                {orders.map(o=>(
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.device_name || 'Sale'}</td><td>{o.total_amount} K</td><td>{o.profit} K</td>
                    <td><Trash2 size={16} color="red" style={styles.ptr} onClick={async()=>{
                      if(window.confirm("ဘောင်ချာဖျက်ရင် စတော့ပြန်တိုးပါမယ်။ ဖျက်မှာလား?")){
                        await supabase.from('orders').delete().eq('id',o.id);
                        for(const i of o.items_json) {
                          const prod = products.find(x=>x.id===i.id);
                          await supabase.from('products').update({stock_quantity: Number(prod.stock_quantity)+i.qty}).eq('id',i.id);
                        }
                        fetchData();
                      }
                    }}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div style={styles.overlay}>
          <form style={styles.modal} onSubmit={saveProduct}>
            <h3>{editingProduct ? 'ပစ္စည်းပြင်ဆင်ရန်' : 'ပစ္စည်းအသစ်ထည့်ရန်'}</h3>
            <input name="name" placeholder="အမည်" defaultValue={editingProduct?.name} style={styles.inp} required/>
            <input name="price" type="number" placeholder="ရောင်းစျေး" defaultValue={editingProduct?.price} style={styles.inp} required/>
            <input name="cost_price" type="number" placeholder="ရင်းစျေး" defaultValue={editingProduct?.cost_price} style={styles.inp} required/>
            <input name="stock_quantity" type="number" placeholder="စတော့အရေအတွက်" defaultValue={editingProduct?.stock_quantity} style={styles.inp} required/>
            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
              <button type="submit" style={styles.saveBtn}>သိမ်းမည်</button>
              <button type="button" onClick={()=>setIsModalOpen(false)} style={styles.cancelBtn}>ပိတ်မည်</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: { height:'100vh', display:'flex', flexDirection:'column', background:'#f4f7f6', fontFamily:'sans-serif' },
  nav: { background:'#875A7B', color:'white', padding:'12px 25px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' },
  navLinks: { display:'flex', alignItems:'center', gap:'15px' },
  navBtn: { background:'none', border:'none', color:'#ddd', padding:'8px 15px', cursor:'pointer', borderRadius:'4px' },
  activeBtn: { background:'#714B67', border:'none', color:'white', padding:'8px 15px', fontWeight:'bold', borderRadius:'4px' },
  main: { flex:1, overflow:'hidden' },
  posGrid: { display:'flex', height:'100%' },
  cartSide: { width:'400px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' },
  cartTitle: { padding:'15px', background:'#e9ecef', fontWeight:'bold', textAlign:'center' },
  cartList: { flex:1, overflowY:'auto', padding:'15px' },
  cartItem: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' },
  qtyBox: { display:'flex', alignItems:'center', gap:'10px' },
  cartFooter: { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' },
  total: { fontSize:'1.5rem', fontWeight:'bold', color:'#875A7B', textAlign:'center', marginBottom:'15px' },
  chkBtn: { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer' },
  prodSide: { flex:1, padding:'20px', overflowY:'auto' },
  searchBar: { display:'flex', alignItems:'center', background:'white', padding:'10px 20px', borderRadius:'30px', border:'1px solid #ddd', marginBottom:'20px' },
  sInp: { border:'none', outline:'none', marginLeft:'10px', width:'100%', fontSize:'1rem' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' },
  pCard: { background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' },
  page: { padding:'30px', overflowY:'auto', height:'100%' },
  table: { width:'100%', borderCollapse:'collapse', background:'white', borderRadius:'8px', overflow:'hidden' },
  addBtn: { padding:'10px 20px', background:'#875A7B', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' },
  ptr: { cursor:'pointer' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:100 },
  modal: { background:'white', padding:'30px', borderRadius:'10px', width:'350px', display:'flex', flexDirection:'column', gap:'12px' },
  inp: { padding:'12px', border:'1px solid #ddd', borderRadius:'5px' },
  saveBtn: { flex:1, padding:'12px', background:'#00A09D', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold' },
  cancelBtn: { flex:1, padding:'12px', background:'#6c757d', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' },
  repGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'30px' },
  stat: { background:'white', padding:'25px', borderRadius:'10px', textAlign:'center', borderLeft:'6px solid #875A7B', boxShadow:'0 2px 6px rgba(0,0,0,0.1)' }
};
