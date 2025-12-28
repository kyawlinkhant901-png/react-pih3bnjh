import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, CreditCard, Wallet, ScanBarcode } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const searchInputRef = useRef(null);

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
    const { data: ph } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    setProducts(p || []); setOrders(o || []); setPurchases(ph || []);
  }

  // --- Enter Key နဲ့ ပစ္စည်းရွေးတဲ့ စနစ် ---
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const found = products.find(p => p.product_code === search || p.name.toLowerCase() === search.toLowerCase());
      const firstMatch = found || products.find(p => p.name.toLowerCase().includes(search.toLowerCase()));
      
      if (firstMatch) {
        addToCart(firstMatch, view === 'pos');
        setSearch(''); // စာသားပြန်ရှင်းမယ်
        e.preventDefault();
      }
    }
  };

  const addToCart = (p, isSale) => {
    const target = isSale ? cart : purchaseCart;
    const setter = isSale ? setCart : setPurchaseCart;
    const exist = target.find(i => i.id === p.id);
    if (exist) {
      setter(target.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setter([...target, { ...p, qty: 1 }]);
    }
  };

  // --- သိမ်းဆည်းခြင်း Logic (Discount ပါဝင်သည်) ---
  const handleCheckout = async (isSale) => {
    const targetCart = isSale ? cart : purchaseCart;
    if (targetCart.length === 0) return;

    const subtotal = targetCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0);
    const total = subtotal - (subtotal * (discount / 100));
    const profit = isSale ? total - targetCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
      total_amount: total,
      discount_percent: discount,
      profit: profit,
      items_json: targetCart,
      device_name: targetCart.map(i => `${i.name} x${i.qty}`).join(', ')
    }]);

    if (!error) {
      for (const item of targetCart) {
        const newStock = isSale ? Number(item.stock_quantity) - item.qty : Number(item.stock_quantity) + item.qty;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
      }
      isSale ? setCart([]) : setPurchaseCart([]);
      setDiscount(0); fetchData();
      alert("သိမ်းဆည်းပြီးပါပြီ။");
    } else { alert("Error: သိမ်းလို့မရပါ (Database ချိတ်ဆက်မှုစစ်ပါ)"); }
  };

  return (
    <div style={st.app}>
      <div style={st.nav}>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <b style={{fontSize:'1.1rem'}}>SMART POS</b>
          <button onClick={()=>setView('pos')} style={view==='pos'?st.act:st.btn}>F1 ရောင်း</button>
          <button onClick={()=>setView('purchase')} style={view==='purchase'?st.act:st.btn}>F2 ဝယ်</button>
          <button onClick={()=>setView('inventory')} style={view==='inventory'?st.act:st.btn}>F3 စတော့</button>
          <button onClick={()=>setView('reports')} style={view==='reports'?st.act:st.btn}>F4 လချုပ်</button>
        </div>
      </div>

      <div style={st.body}>
        {(view === 'pos' || view === 'purchase') && (
          <div style={st.posGrid}>
            <div style={st.cartSide}>
              <div style={st.cartHead}>{view==='pos'?'အရောင်း':'အဝယ်'}</div>
              <div style={st.cartList}>
                {(view==='pos'?cart:purchaseCart).map(item => (
                  <div key={item.id} style={st.cartRow}>
                    <div style={{flex:1}}><b>{item.name}</b><br/>{view==='pos'?item.price:item.cost_price} K</div>
                    <div style={st.qtyCtl}>
                      <Minus size={16} onClick={()=>{
                        const s = view==='pos'?setCart:setPurchaseCart;
                        const c = view==='pos'?cart:purchaseCart;
                        s(c.map(i=>i.id===item.id?{...i, qty:Math.max(1, i.qty-1)}:i));
                      }}/>
                      <b>{item.qty}</b>
                      <Plus size={16} onClick={()=>addToCart(item, view==='pos')}/>
                      <Trash2 size={16} color="red" onClick={()=>{
                         const s = view==='pos'?setCart:setPurchaseCart;
                         s((view==='pos'?cart:purchaseCart).filter(i=>i.id!==item.id));
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={st.cartFoot}>
                <div style={st.disRow}>Discount %: <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} style={st.disInp}/></div>
                <div style={st.total}>Net: {( (view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0) * (1-discount/100) ).toLocaleString()} K</div>
                <button style={st.saveBtn} onClick={()=>handleCheckout(view==='pos')}>သိမ်းမည် (Enter)</button>
              </div>
            </div>

            <div style={st.prodSide}>
              <div style={st.searchBox}>
                <ScanBarcode size={20}/>
                <input 
                  ref={searchInputRef}
                  autoFocus 
                  placeholder="Barcode သို့မဟုတ် နာမည်ရိုက်ပြီး Enter နှိပ်ပါ..." 
                  value={search} 
                  onChange={e=>setSearch(e.target.value)} 
                  onKeyDown={handleSearchKeyDown}
                  style={st.sInp}
                />
              </div>
              <div style={st.grid}>
                {products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(
                  <div key={p.id} style={st.card} onClick={()=>addToCart(p, view==='pos')}>
                    <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K<br/><small>Stock: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div style={st.page}>
            <h3>လချုပ်မှတ်တမ်းများ</h3>
            <div style={st.statGrid}>
              <div style={st.statCard}><h4>ယနေ့ရောင်းအား</h4><h2>{orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).reduce((a,b)=>a+Number(b.total_amount),0).toLocaleString()} K</h2></div>
              <div style={st.statCard}><h4>ယနေ့အမြတ်</h4><h2>{orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).reduce((a,b)=>a+Number(b.profit),0).toLocaleString()} K</h2></div>
            </div>
            <h4>အရောင်းမှတ်တမ်း</h4>
            <table style={st.table}>
              <thead><tr><th>နေ့စွဲ</th><th>အသေးစိတ်</th><th>Discount</th><th>စုစုပေါင်း</th><th>Action</th></tr></thead>
              <tbody>{orders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.device_name}</td><td>{o.discount_percent}%</td><td>{o.total_amount} K</td><td><Trash2 size={16} color="red" onClick={async()=>{if(window.confirm("ဖျက်မှာလား?")){await supabase.from('orders').delete().eq('id',o.id); fetchData();}}}/></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  app: { height:'100vh', display:'flex', flexDirection:'column', background:'#f4f7f6', fontFamily:'sans-serif' },
  nav: { background:'#875A7B', color:'white', padding:'10px 20px' },
  btn: { background:'none', border:'none', color:'#ddd', padding:'8px 12px', cursor:'pointer' },
  act: { background:'#714B67', border:'none', color:'white', padding:'8px 12px', borderRadius:'4px', fontWeight:'bold' },
  body: { flex:1, overflow:'hidden' },
  posGrid: { display:'flex', height:'100%' },
  cartSide: { width:'380px', background:'white', borderRight:'1px solid #ddd', display:'flex', flexDirection:'column' },
  cartHead: { padding:'15px', background:'#e9ecef', fontWeight:'bold', textAlign:'center' },
  cartList: { flex:1, overflowY:'auto', padding:'15px' },
  cartRow: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' },
  qtyCtl: { display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' },
  cartFoot: { padding:'20px', background:'#f8f9fa', borderTop:'2px solid #ddd' },
  disRow: { marginBottom:'10px', fontSize:'14px' },
  disInp: { width:'50px', padding:'5px', borderRadius:'4px', border:'1px solid #ddd' },
  total: { fontSize:'1.4rem', fontWeight:'bold', color:'#875A7B', marginBottom:'15px', textAlign:'center' },
  saveBtn: { width:'100%', padding:'15px', background:'#00A09D', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer' },
  prodSide: { flex:1, padding:'20px', overflowY:'auto' },
  searchBox: { display:'flex', alignItems:'center', background:'white', padding:'10px 20px', borderRadius:'30px', border:'1px solid #ddd', marginBottom:'20px' },
  sInp: { border:'none', outline:'none', marginLeft:'10px', width:'100%', fontSize:'1rem' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px' },
  card: { background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', textAlign:'center', cursor:'pointer' },
  page: { padding:'30px', overflowY:'auto', height:'100%' },
  table: { width:'100%', borderCollapse:'collapse', background:'white', marginTop:'15px' },
  statGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' },
  statCard: { background:'white', padding:'20px', borderRadius:'8px', textAlign:'center', borderLeft:'5px solid #875A7B' }
};
