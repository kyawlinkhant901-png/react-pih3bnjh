import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, Camera, Wallet, X } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []);
  }

  // --- Enter Key နဲ့ ပစ္စည်းရွေးတာကို အသေအချာပြင်ထားတယ် ---
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const match = products.find(p => 
        p.product_code === search || 
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      if (match) {
        addToCart(match, view === 'pos');
        setSearch(''); // ရွေးပြီးရင် စာသားရှင်းမယ်
      }
      e.preventDefault();
    }
  };

  const addToCart = (p, isSale) => {
    const target = isSale ? cart : purchaseCart;
    const setter = isSale ? setCart : setPurchaseCart;
    
    if (!isSale && products.some(i => i.id === p.id)) {
        if (!window.confirm("ဒီပစ္စည်းရှိပြီးသားပါ။ အဝယ်စာရင်းထဲ ထပ်ပေါင်းမလား?")) return;
    }

    const exist = target.find(i => i.id === p.id);
    if (exist) setter(target.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    else setter([...target, { ...p, qty: 1 }]);
  };

  const handleSave = async () => {
    const isSale = view === 'pos';
    const currentCart = isSale ? cart : purchaseCart;
    if (currentCart.length === 0) return alert("ပစ္စည်းရွေးပါဦး");

    const total = currentCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0) * (1 - discount/100);
    const profit = isSale ? total - currentCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
      total_amount: total,
      items_json: currentCart,
      profit: profit,
      device_name: currentCart.map(i => `${i.name} x${i.qty}`).join(', ')
    }]);

    if (!error) {
      for (const item of currentCart) {
        const newQty = isSale ? item.stock_quantity - item.qty : item.stock_quantity + item.qty;
        await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.id);
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      fetchData(); alert("Yadana POS: အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။");
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.nav}>
        <h2 style={{color:'#00d2d3'}}>Yadana POS</h2>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={()=>setView('pos')} style={view==='pos'?styles.act:styles.btn}>အရောင်း (F1)</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?styles.act:styles.btn}>အဝယ် (F2)</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?styles.act:styles.btn}>စတော့ (F3)</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?styles.act:styles.btn}>လချုပ် (F4)</button>
        </div>
      </div>

      <div style={styles.content}>
        {(view==='pos' || view==='purchase') && (
          <div style={styles.posGrid}>
            <div style={styles.mainArea}>
              <div style={styles.searchBar}>
                <Search size={20}/>
                <input 
                  autoFocus
                  placeholder="Barcode ဖတ်ပါ သို့မဟုတ် အမည်ရိုက်ပြီး Enter နှိပ်ပါ..." 
                  value={search}
                  onKeyDown={handleSearchKeyDown}
                  onChange={e=>setSearch(e.target.value)}
                  style={styles.inp}
                />
              </div>
              <div style={styles.grid}>
                {products.filter(p=>p.name.includes(search)).map(p=>(
                  <div key={p.id} onClick={()=>addToCart(p, view==='pos')} style={styles.card}>
                    <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K<br/><small>စတော့: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.cartSide}>
              <h3>{view==='pos'?'အရောင်းဘောင်ချာ':'အဝယ်ဘောင်ချာ'}</h3>
              <div style={{flex:1, overflowY:'auto'}}>
                {(view==='pos'?cart:purchaseCart).map(i=>(
                  <div key={i.id} style={styles.cartItem}>
                    <span>{i.name} x{i.qty}</span>
                    <Trash2 size={16} color="red" onClick={()=>view==='pos'?setCart(cart.filter(x=>x.id!==i.id)):setPurchaseCart(purchaseCart.filter(x=>x.id!==i.id))}/>
                  </div>
                ))}
              </div>
              <div style={styles.footer}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                  <span>လျှော့စျေး %</span>
                  <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} style={{width:'50px'}}/>
                </div>
                <h3>စုစုပေါင်း: {( (view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0) * (1-discount/100) ).toLocaleString()} K</h3>
                <button onClick={handleSave} style={styles.saveBtn}>သိမ်းမည် (Confirm)</button>
              </div>
            </div>
          </div>
        )}
        {/* Reports Table */}
        {view === 'reports' && (
          <div style={styles.reportPage}>
            <h3>လချုပ်မှတ်တမ်း (Monthly Report)</h3>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
               <thead style={{background:'#eee'}}><tr><th>ရက်စွဲ</th><th>အသေးစိတ်</th><th>ရောင်းရငွေ</th><th>အမြတ်</th><th>ဖျက်ရန်</th></tr></thead>
               <tbody>{orders.map(o=><tr key={o.id} style={{borderBottom:'1px solid #ddd'}}><td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.device_name}</td><td>{o.total_amount} K</td><td>{o.profit} K</td><td><Trash2 size={16} color="red" onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('orders').delete().eq('id',o.id); fetchData();}}}/></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: { height:'100vh', display:'flex', flexDirection:'column', background:'#f0f4f8', fontFamily:'sans-serif' },
  nav: { background:'#1a1a1a', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  btn: { background:'none', border:'none', color:'#ccc', padding:'10px', cursor:'pointer' },
  act: { background:'#00d2d3', border:'none', color:'white', padding:'10px 15px', borderRadius:'5px', fontWeight:'bold' },
  content: { flex:1, overflow:'hidden', padding:'20px' },
  posGrid: { display:'flex', gap:'20px', height:'100%' },
  mainArea: { flex:1, display:'flex', flexDirection:'column', gap:'20px' },
  searchBar: { display:'flex', alignItems:'center', background:'white', padding:'10px 20px', borderRadius:'30px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' },
  inp: { border:'none', outline:'none', marginLeft:'10px', width:'100%', fontSize:'16px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'15px', overflowY:'auto' },
  card: { background:'white', padding:'15px', borderRadius:'15px', textAlign:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
  cartSide: { width:'350px', background:'white', borderRadius:'20px', padding:'20px', display:'flex', flexDirection:'column', boxShadow:'0 5px 15px rgba(0,0,0,0.1)' },
  cartItem: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' },
  footer: { borderTop:'2px solid #eee', paddingTop:'20px' },
  saveBtn: { width:'100%', padding:'15px', background:'#1a1a1a', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' },
  reportPage: { background:'white', padding:'20px', borderRadius:'20px', height:'100%', overflowY:'auto' }
};
