import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, 
  Plus, Minus, Camera, Wallet, X, CheckCircle 
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

  useEffect(() => {
    fetchData();
    // Barcode Scanner Setup
    if (view === 'pos' || view === 'purchase') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render((text) => {
        setSearch(text);
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

  const handleBarcodeSearch = (code) => {
    const p = products.find(i => i.product_code === code);
    if (p) addToCart(p, view === 'pos');
  };

  const addToCart = (p, isSale) => {
    const target = isSale ? cart : purchaseCart;
    const setter = isSale ? setCart : setPurchaseCart;
    
    // Duplicate Check for Purchase
    if (!isSale) {
      const existsInInventory = products.find(i => i.product_code === p.product_code);
      if (existsInInventory && purchaseCart.length === 0) {
        if (!window.confirm("ဒီပစ္စည်းက စာရင်းထဲမှာ ရှိပြီးသားပါ။ ထပ်ပေါင်းထည့်မှာလား?")) return;
      }
    }

    const exist = target.find(i => i.id === p.id);
    if (exist) {
      setter(target.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setter([...target, { ...p, qty: 1 }]);
    }
  };

  // --- အဝယ်/အရောင်း အတည်ပြုခြင်း (Button Fix) ---
  const handleFinalize = async () => {
    const isSale = view === 'pos';
    const targetCart = isSale ? cart : purchaseCart;
    if (targetCart.length === 0) return alert("ပစ္စည်းအရင်ရွေးပါ");

    const total = targetCart.reduce((a, b) => a + ((isSale ? b.price : b.cost_price) * b.qty), 0) * (1 - discount/100);
    const profit = isSale ? total - targetCart.reduce((a, b) => a + (b.cost_price * b.qty), 0) : 0;

    const { data, error } = await supabase.from(isSale ? 'orders' : 'purchase_orders').insert([{
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
      fetchData(); alert("အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။");
    } else {
      alert("Error: " + error.message);
    }
  };

  return (
    <div style={st.app}>
      <div style={st.sidebar}>
        <div style={st.brand}>Yadana</div>
        <button onClick={()=>setView('pos')} style={view==='pos'?st.actTab:st.tab}><ShoppingCart/> POS</button>
        <button onClick={()=>setView('purchase')} style={view==='purchase'?st.actTab:st.tab}><Package/> Purchase</button>
        <button onClick={()=>setView('inventory')} style={view==='inventory'?st.actTab:st.tab}><Edit3/> Inventory</button>
        <button onClick={()=>setView('expenses')} style={view==='expenses'?st.actTab:st.tab}><Wallet/> Expenses</button>
        <button onClick={()=>setView('reports')} style={view==='reports'?st.actTab:st.tab}><BarChart3/> Reports</button>
      </div>

      <div style={st.main}>
        {/* Scanner Section */}
        {(view === 'pos' || view === 'purchase') && (
          <div style={{padding:'20px'}}>
            <div id="reader" style={{width:'300px', borderRadius:'15px', overflow:'hidden', marginBottom:'10px'}}></div>
            <div style={st.searchRow}>
              <Search/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Scan or Type name..." style={st.inp}/>
            </div>
          </div>
        )}

        <div style={st.content}>
          {view === 'pos' || view === 'purchase' ? (
            <div style={st.posLayout}>
               <div style={st.prodGrid}>
                  {products.filter(p=>p.name.includes(search)).map(p=>(
                    <div key={p.id} style={st.card} onClick={()=>addToCart(p, view==='pos')}>
                      <b>{p.name}</b><br/>{view==='pos'?p.price:p.cost_price} K
                    </div>
                  ))}
               </div>
               <div style={st.cartSide}>
                  <h3>{view==='pos'?'Sale Cart':'Purchase Cart'}</h3>
                  { (view==='pos'?cart:purchaseCart).map(item=>(
                    <div key={item.id} style={st.cartRow}>
                      <span>{item.name} x{item.qty}</span>
                      <Trash2 size={16} onClick={()=>(view==='pos'?setCart(cart.filter(i=>i.id!==item.id)):setPurchaseCart(purchaseCart.filter(i=>i.id!==item.id)))}/>
                    </div>
                  ))}
                  <div style={st.footer}>
                    <h3>Total: {(view==='pos'?cart:purchaseCart).reduce((a,b)=>a+((view==='pos'?b.price:b.cost_price)*b.qty),0)} K</h3>
                    <button onClick={handleFinalize} style={st.bigBtn}>အတည်ပြုမည်</button>
                  </div>
               </div>
            </div>
          ) : view === 'expenses' ? (
            <div style={st.page}>
               <h2>Expenses (အသုံးစရိတ်)</h2>
               <button onClick={async()=>{
                 const title = prompt("အကြောင်းအရာ");
                 const amount = prompt("ပမာဏ");
                 if(title && amount) await supabase.from('expenses').insert([{title, amount}]);
                 fetchData();
               }} style={st.addBtn}>+ အသုံးစရိတ်အသစ်</button>
               <table style={st.table}>
                  {expenses.map(ex=><tr key={ex.id}><td>{ex.title}</td><td>{ex.amount} K</td></tr>)}
               </table>
            </div>
          ) : (
            <div style={st.page}>
               <h2>Sales History</h2>
               <table style={st.table}>
                  <thead><tr><th>Date</th><th>Items</th><th>Total</th><th>Action</th></tr></thead>
                  <tbody>
                    {orders.map(o=>(
                      <tr key={o.id}>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>{o.device_name}</td>
                        <td>{o.total_amount} K</td>
                        <td>
                          <Trash2 color="red" onClick={async()=>{
                            if(window.confirm("ဘောင်ချာဖျက်မှာလား?")){
                               await supabase.from('orders').delete().eq('id', o.id);
                               fetchData();
                            }
                          }}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const st = {
  app: { display:'flex', height:'100vh', fontFamily:'Poppins, sans-serif', background:'#f0f2f5' },
  sidebar: { width:'240px', background:'#1a1a1a', color:'white', padding:'20px' },
  brand: { fontSize:'24px', fontWeight:'bold', color:'#00d2d3', marginBottom:'30px', textAlign:'center' },
  tab: { width:'100%', padding:'15px', background:'none', border:'none', color:'#ccc', display:'flex', gap:'10px', cursor:'pointer', textAlign:'left' },
  actTab: { width:'100%', padding:'15px', background:'#00d2d3', border:'none', color:'white', display:'flex', gap:'10px', borderRadius:'10px', fontWeight:'bold' },
  main: { flex:1, display:'flex', flexDirection:'column' },
  content: { flex:1, padding:'20px', overflowY:'auto' },
  posLayout: { display:'flex', gap:'20px', height:'100%' },
  prodGrid: { flex:1, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'15px' },
  card: { background:'white', padding:'15px', borderRadius:'15px', textAlign:'center', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
  cartSide: { width:'350px', background:'white', borderRadius:'20px', padding:'20px', display:'flex', flexDirection:'column' },
  cartRow: { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' },
  footer: { marginTop:'auto', paddingTop:'20px' },
  bigBtn: { width:'100%', padding:'15px', background:'#1a1a1a', color:'white', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer' },
  searchRow: { display:'flex', alignItems:'center', background:'white', padding:'10px 20px', borderRadius:'30px', width:'400px' },
  inp: { border:'none', outline:'none', marginLeft:'10px', width:'100%' },
  page: { background:'white', padding:'30px', borderRadius:'20px' },
  table: { width:'100%', marginTop:'20px', borderCollapse:'collapse' },
  addBtn: { padding:'10px 20px', background:'#00d2d3', color:'white', border:'none', borderRadius:'8px', cursor:'pointer' }
};
