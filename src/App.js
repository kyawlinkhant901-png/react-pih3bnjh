import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, CreditCard, Wallet, ScanBarcode, X, Save
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isProductModal, setIsProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
    const handleKeys = (e) => {
      if (e.key === 'F1') setView('pos');
      if (e.key === 'F2') setView('purchase');
      if (e.key === 'F3') setView('inventory');
      if (e.key === 'F4') setView('reports');
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

  // --- Cart Engine (အရောင်းရော အဝယ်မှာပါ သုံးလို့ရသည်) ---
  const handleQty = (id, change, isSale) => {
    const currentCart = isSale ? cart : purchaseCart;
    const setTarget = isSale ? setCart : setPurchaseCart;
    setTarget(currentCart.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + change) } : item));
  };

  const removeFromCart = (id, isSale) => {
    isSale ? setCart(cart.filter(i => i.id !== id)) : setPurchaseCart(purchaseCart.filter(i => i.id !== id));
  };

  // --- Checkout Logic (Stock Adjustment ပါဝင်သည်) ---
  const checkout = async (isSale) => {
    const targetCart = isSale ? cart : purchaseCart;
    if (targetCart.length === 0) return;

    const total = targetCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0);
    const profit = isSale ? total - targetCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
      total_amount: total,
      profit: profit,
      items_json: targetCart,
      device_name: targetCart.map(i => `${i.name} x${i.qty}`).join(', ')
    }]);

    if (!error) {
      for (const item of targetCart) {
        const newStock = isSale ? item.stock_quantity - item.qty : item.stock_quantity + item.qty;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      fetchData(); alert("သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  // --- Daily & Monthly Stats ---
  const today = new Date().toDateString();
  const todaySales = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const dailyRev = todaySales.reduce((a, b) => a + Number(b.total_amount), 0);
  const dailyProfit = todaySales.reduce((a, b) => a + Number(b.profit), 0);

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.nav}>
        <div style={{display:'flex', gap:'15px'}}>
          <b style={{fontSize:'20px', marginRight:'20px'}}>MASTER POS</b>
          <button onClick={()=>setView('pos')} style={view==='pos'?styles.activeBtn:styles.navBtn}>F1 အရောင်း</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?styles.activeBtn:styles.navBtn}>F2 အဝယ်</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?styles.activeBtn:styles.navBtn}>F3 စတော့</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?styles.activeBtn:styles.navBtn}>F4 လချုပ်/Report</button>
        </div>
      </div>

      <div style={styles.body}>
        {/* --- POS Layout --- */}
        {(view === 'pos' || view === 'purchase') && (
          <div style={styles.posGrid}>
            <div style={styles.cartSection}>
              <div style={styles.cartHeader}>{view==='pos'?'အရောင်းဘောင်ချာ':'အဝယ်ဘောင်ချာ'}</div>
              <div style={styles.cartList}>
                {(view==='pos'?cart:purchaseCart).map(item => (
                  <div key={item.id} style={styles.cartRow}>
                    <div style={{flex:1}}><b>{item.name}</b><br/><small>{view==='pos'?item.price:item.cost_price} K</small></div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <Minus size={16} style={styles.icon} onClick={()=>handleQty(item.id, -1, view==='pos')}/>
                      <b>{item.qty}</b>
                      <Plus size={16} style={styles.icon} onClick={()=>handleQty(item.id, 1, view==='pos')}/>
                      <Trash2 size={16} color="red" style={styles.icon} onClick={()=>removeFromCart(item.id, view==='pos')}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.cartFooter}>
                <div style={styles.totalLine}>Total: {(view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0).toLocaleString()} K</div>
                <button onClick={()=>checkout(view==='pos')} style={styles.payBtn}>သိမ်းမည် (Save)</button>
              </div>
            </div>
            <div style={styles.prodSection}>
              <div style={styles.searchBar}><ScanBarcode size={20}/><input placeholder="Barcode သို့မဟုတ် အမည်ဖြင့်ရှာပါ..." onChange={e=>setSearch(e.target.value)} style={styles.searchInp}/></div>
              <div style={styles.grid}>
                {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()) || p.product_code?.includes(search)).map(p => (
                  <div key={p.id} onClick={()=>{
                    const target = view==='pos'?cart:purchaseCart;
                    const setter = view==='pos'?setCart:setPurchaseCart;
                    const exist = target.find(i=>i.id===p.id);
                    if(exist) handleQty(p.id, 1, view==='pos');
                    else setter([...target, {...p, qty: 1}]);
                  }} style={styles.pCard}>
                    <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K<br/><small>စတော့: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- Reports View --- */}
        {view === 'reports' && (
          <div style={styles.page}>
            <div style={styles.reportStats}>
              <div style={styles.statCard}><h4>ယနေ့ရောင်းအား</h4><h2>{dailyRev.toLocaleString()} K</h2></div>
              <div style={styles.statCard}><h4>ယနေ့အမြတ်</h4><h2>{dailyProfit.toLocaleString()} K</h2></div>
              <div style={styles.statCard}><h4>အသုံးစရိတ်</h4><h2>{expenses.reduce((a,b)=>a+Number(b.amount),0).toLocaleString()} K</h2></div>
            </div>
            <h3>အရောင်းမှတ်တမ်းများ</h3>
            <table style={styles.table}>
              <thead><tr><th>နေ့စွဲ</th><th>အသေးစိတ်</th><th>ပမာဏ</th><th>အမြတ်</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>{o.device_name}</td><td>{o.total_amount} K</td><td>{o.profit} K</td>
                    <td><Trash2 size={16} color="red" style={styles.icon} onClick={async()=>{
                      if(window.confirm("ဘောင်ချာဖျက်မှာလား? စတော့ပြန်တိုးပါမယ်။")){
                        await supabase.from('orders').delete().eq('id', o.id);
                        for(const i of o.items_json) {
                          const p = products.find(x=>x.id===i.id);
                          await supabase.from('products').update({stock_quantity: p.stock_quantity + i.qty}).eq('id', i.id);
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

        {/* --- Inventory View --- */}
        {view === 'inventory' && (
          <div style={styles.page}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h3>စတော့စီမံခန့်ခွဲမှု</h3><button onClick={()=>{setEditingItem(null); setIsProductModal(true)}} style={styles.odooBtn}>+ ပစ္စည်းအသစ်ထည့်ရန်</button></div>
            <table style={styles.table}>
              <thead><tr><th>အမည်</th><th>ရောင်းစျေး</th><th>ရင်းစျေး</th><th>လက်ကျန်</th><th>ပြင်/ဖျက်</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.price}</td><td>{p.cost_price}</td><td>{p.stock_quantity}</td>
                    <td><Edit3 size={16} style={styles.icon} onClick={()=>{setEditingItem(p); setIsProductModal(true)}}/><Trash2 size={16} color="red" style={styles.icon} onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('products').delete().eq('id',p.id); fetchData()}}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isProductModal && (
        <div style={styles.overlay}>
          <form style={styles.modal} onSubmit={async(e)=>{
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.target));
            if(editingItem) await supabase.from('products').update(d).eq('id', editingItem.id);
            else await supabase.from('products').insert([d]);
            setIsProductModal(false); fetchData();
          }}>
            <h3>{editingItem ? 'ပစ္စည်းပြင်ဆင်ရန်' : 'ပစ္စည်းအသစ်'}</h3>
            <input name="name" placeholder="အမည်" defaultValue={editingItem?.name} style={styles.inp} required/>
            <input name="price" type="number" placeholder="ရောင်းစျေး" defaultValue={editingItem?.price} style={styles.inp} required/>
            <input name="cost_price" type="number" placeholder="ရင်းစျေး" defaultValue={editingItem?.cost_price} style={styles.inp} required/>
            <input name="stock_quantity" type="number" placeholder="စတော့အရေအတွက်" defaultValue={editingItem?.stock_quantity} style={styles.inp} required/>
            <div style={{display:'flex', gap:'10px'}}><button type="submit" style={styles.saveBtn}>SAVE</button><button type="button" onClick={()=>setIsProductModal(false)} style={styles.cancelBtn}>CANCEL</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height:'100vh', display:'flex', flexDirection:'column', background:'#f0f2f5', fontFamily:'sans-serif' },
  nav: { background:'#875A7B', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  navBtn: { background:'none', border:'none', color:'#eee', padding:'10px 15px', cursor:'pointer' },
  activeBtn: { background:'#714B67', border:'none', color:'white', padding:'10px 15px', borderRadius:'4px', fontWeight:'bold' },
  body: { flex:1, overflow:'hidden' },
  posGrid: { display:'flex', height:'100%' },
  cartSection: { width:'400px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' },
  cartHeader: { padding:'15px', background:'#e9ecef', fontWeight:'bold', textAlign:'center' },
  cartList: { flex:1, overflowY:'auto', padding:'15px' },
  cartRow: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' },
  cartFooter: { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' },
  totalLine: { fontSize:'24px', fontWeight:'bold', color:'#875A7B', marginBottom:'15px', textAlign:'center' },
  payBtn: { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer' },
  prodSection: { flex:1, padding:'20px', overflowY:'auto' },
  searchBar: { display:'flex', alignItems:'center', background:'white', padding:'10px 15px', borderRadius:'25px', marginBottom:'20px', border:'1px solid #ddd' },
  searchInp: { border:'none', outline:'none', marginLeft:'10px', width:'100%' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' },
  pCard: { background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer' },
  page: { padding:'30px', overflowY:'auto', height:'100%' },
  table: { width:'100%', borderCollapse:'collapse', marginTop:'20px', background:'white' },
  icon: { cursor:'pointer' },
  reportStats: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px', marginBottom:'30px' },
  statCard: { background:'white', padding:'20px', borderRadius:'8px', borderLeft:'5px solid #875A7B', textAlign:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' },
  odooBtn: { padding:'10px 20px', background:'#875A7B', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center' },
  modal: { background:'white', padding:'30px', borderRadius:'8px', width:'350px', display:'flex', flexDirection:'column', gap:'10px' },
  inp: { padding:'10px', border:'1px solid #ddd', borderRadius:'4px' },
  saveBtn: { padding:'12px', background:'#00A09D', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' },
  cancelBtn: { padding:'12px', background:'#666', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' }
};
