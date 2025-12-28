import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Trash2, Printer, Search, Save } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos'); 
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState({ productId: '', qty: '', cost: '' });
  const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '' });
  const [dailySales, setDailySales] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0];
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: s } = await supabase.from('orders').select('total_amount').gte('created_at', today);
    const { data: e } = await supabase.from('expenses').select('amount').gte('created_at', today);
    
    setProducts(p || []);
    setDailySales(s?.reduce((a, b) => a + Number(b.total_amount), 0) || 0);
    setDailyExpenses(e?.reduce((a, b) => a + Number(b.amount), 0) || 0);
  }

  // --- အဝယ်ဘောင်ချာ သွင်းခြင်း ---
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.productId || !purchaseForm.qty) return alert("အချက်အလက်ပြည့်စုံပါစေ");

    const { error: pError } = await supabase.from('purchases').insert([{
      item_name: products.find(p => p.id === purchaseForm.productId)?.name,
      amount: Number(purchaseForm.cost)
    }]);

    if (!pError) {
      await supabase.rpc('handle_purchase', { 
        p_id: purchaseForm.productId, 
        quantity_to_add: parseInt(purchaseForm.qty) 
      });
      alert("အဝယ်ဘောင်ချာသိမ်းပြီး၊ စတော့တိုးလိုက်ပါပြီ။");
      setPurchaseForm({ productId: '', qty: '', cost: '' });
      fetchData();
    }
  };

  // --- အရောင်း (Checkout) ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + b.price, 0);
    const { error } = await supabase.from('orders').insert([{ 
      total_amount: total, 
      device_name: cart.map(i => i.name).join(', ') 
    }]);
    
    if (!error) {
      for (const item of cart) {
        await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: 1 });
      }
      if (window.confirm("ရောင်းချမှုအောင်မြင်သည်။ Print ထုတ်မလား?")) window.print();
      setCart([]); fetchData();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f0f2f5' }}>
      {/* Sidebar - No Print Area */}
      <div className="no-print" style={{ width: '260px', background: '#1c1e21', color: '#fff', padding: '20px' }}>
        <h2 style={{ color: '#4e73df', marginBottom: '30px' }}>Smart Business</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setView('pos')} style={sidebarBtn(view === 'pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('purchase')} style={sidebarBtn(view === 'purchase')}><PlusCircle size={18}/> အဝယ်ဘောင်ချာ</button>
          <button onClick={() => setView('expense')} style={sidebarBtn(view === 'expense')}><Wallet size={18}/> အိမ်သုံး/အထွေထွေ</button>
          <button onClick={() => setView('dashboard')} style={sidebarBtn(view === 'dashboard')}><LayoutDashboard size={18}/> Dashboard</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="no-print" style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {products.map(p => (
                  <div key={p.id} onClick={() => setCart([...cart, {...p, cid: Math.random()}])} style={itemCard}>
                    <div style={{fontSize:'30px'}}>📦</div>
                    <b>{p.name}</b><br/>
                    <span style={{color:'#4e73df'}}>{p.price.toLocaleString()} K</span><br/>
                    <small>ကျန်: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartPanel}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              <div style={{flex: 1, overflowY: 'auto'}}>
                {cart.map((c, i) => <div key={i} style={cartItem}>{c.name} <span>{c.price} K</span></div>)}
              </div>
              <div style={{borderTop: '1px solid #ddd', paddingTop: '10px'}}>
                <h4>စုစုပေါင်း: {cart.reduce((a,b)=>a+b.price,0).toLocaleString()} K</h4>
                <button onClick={handleCheckout} style={btnPrimary}>Check Out</button>
              </div>
            </div>
          </div>
        )}

        {view === 'purchase' && (
          <div style={formBox}>
            <h3>🛒 အဝယ်ဘောင်ချာအသစ်သွင်းရန်</h3>
            <form onSubmit={handlePurchaseSubmit}>
              <label>ပစ္စည်းရွေးပါ</label>
              <select style={inputStyle} value={purchaseForm.productId} onChange={e => setPurchaseForm({...purchaseForm, productId: e.target.value})}>
                <option value="">-- ရွေးရန် --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label>ဝယ်ယူသည့် အရေအတွက်</label>
              <input type="number" style={inputStyle} value={purchaseForm.qty} onChange={e => setPurchaseForm({...purchaseForm, qty: e.target.value})} />
              <label>ဝယ်စျေးစုစုပေါင်း (Optional)</label>
              <input type="number" style={inputStyle} value={purchaseForm.cost} onChange={e => setPurchaseForm({...purchaseForm, cost: e.target.value})} />
              <button type="submit" style={btnPrimary}><Save size={18}/> စာရင်းသွင်းမည်</button>
            </form>
          </div>
        )}

        {view === 'expense' && (
          <div style={formBox}>
            <h3>🏠 အိမ်သုံး/အထွေထွေ အသုံးစရိတ်</h3>
            <input placeholder="အကြောင်းအရာ" style={inputStyle} value={expenseForm.desc} onChange={e => setExpenseForm({...expenseForm, desc: e.target.value})} />
            <input type="number" placeholder="ကုန်ကျငွေ" style={inputStyle} value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
            <button onClick={async () => {
              await supabase.from('expenses').insert([{ description: expenseForm.desc, amount: Number(expenseForm.amount) }]);
              alert("စာရင်းသွင်းပြီးပါပြီ"); setExpenseForm({desc:'', amount:''}); fetchData();
            }} style={btnPrimary}>သိမ်းဆည်းမည်</button>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={{...dashCard, background: '#4e73df'}}><h4>ယနေ့အရောင်း</h4><h2>{dailySales.toLocaleString()} K</h2></div>
            <div style={{...dashCard, background: '#e74a3b'}}><h4>ယနေ့အသုံးစရိတ်</h4><h2>{dailyExpenses.toLocaleString()} K</h2></div>
            <div style={{...dashCard, background: '#1cc88a'}}><h4>အသားတင်အမြတ်</h4><h2>{(dailySales - dailyExpenses).toLocaleString()} K</h2></div>
          </div>
        )}
      </div>

      {/* Print Section */}
      <style>{`
        @media print { .no-print { display: none !important; } .print-only { display: block !important; } }
        .print-only { display: none; font-family: monospace; width: 300px; padding: 20px; }
      `}</style>
      <div className="print-only">
        <center><h3>MY SHOP POS</h3><p>{new Date().toLocaleString()}</p></center>
        <hr/>
        {cart.map((c, i) => <div key={i}>{c.name} .... {c.price} K</div>)}
        <hr/>
        <h4>TOTAL: {cart.reduce((a,b)=>a+b.price,0)} K</h4>
        <center><p>ကျေးဇူးတင်ပါသည်</p></center>
      </div>
    </div>
  );
}

// CSS Styles
const sidebarBtn = (active) => ({ width: '100%', padding: '12px', textAlign: 'left', background: active ? '#4e73df' : 'none', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' });
const itemCard = { background: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const cartPanel = { width: '320px', background: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const cartItem = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd' };
const btnPrimary = { width: '100%', padding: '12px', background: '#4e73df', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const formBox = { maxWidth: '450px', background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
const dashCard = { padding: '30px', borderRadius: '15px', color: '#fff', textAlign: 'center' };
