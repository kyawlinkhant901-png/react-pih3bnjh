import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Store, PlusCircle, Wallet, LayoutDashboard, Wifi, WifiOff, CloudUpload, Trash2, Printer, Save } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineOrders, setOfflineOrders] = useState(JSON.parse(localStorage.getItem('offline_orders')) || []);
  const [purchaseForm, setPurchaseForm] = useState({ productId: '', qty: '', cost: '' });
  const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '' });
  const [dailySales, setDailySales] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);

  useEffect(() => {
    fetchData();
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, [isOnline]);

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0];
    if (isOnline) {
      const { data: p } = await supabase.from('products').select('*').order('name');
      const { data: s } = await supabase.from('orders').select('total_amount').gte('created_at', today);
      const { data: e } = await supabase.from('expenses').select('amount').gte('created_at', today);
      
      setProducts(p || []);
      setDailySales(s?.reduce((a, b) => a + Number(b.total_amount), 0) || 0);
      setDailyExpenses(e?.reduce((a, b) => a + Number(b.amount), 0) || 0);
      localStorage.setItem('products_cache', JSON.stringify(p));
    } else {
      setProducts(JSON.parse(localStorage.getItem('products_cache')) || []);
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + b.price, 0);
    const orderData = { total_amount: total, device_name: cart.map(i => i.name).join(', '), created_at: new Date() };

    if (isOnline) {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (!error) {
        for (const item of cart) {
          await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: 1 });
        }
        if (window.confirm("အရောင်းအောင်မြင်သည်။ Print ထုတ်မလား?")) window.print();
      }
    } else {
      const newOffline = [...offlineOrders, orderData];
      setOfflineOrders(newOffline);
      localStorage.setItem('offline_orders', JSON.stringify(newOffline));
      alert("Offline အနေဖြင့် သိမ်းဆည်းလိုက်ပါပြီ။");
    }
    setCart([]); fetchData();
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!isOnline) return alert("အဝယ်စာရင်းသွင်းရန် အင်တာနက်လိုအပ်ပါသည်။");
    const { error } = await supabase.from('purchases').insert([{
      item_name: products.find(p => p.id === purchaseForm.productId)?.name,
      amount: Number(purchaseForm.cost)
    }]);
    if (!error) {
      await supabase.rpc('handle_purchase', { p_id: purchaseForm.productId, quantity_to_add: parseInt(purchaseForm.qty) });
      alert("အဝယ်စာရင်းသွင်းပြီးပါပြီ။");
      setPurchaseForm({ productId: '', qty: '', cost: '' });
      fetchData();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f4f7f6' }}>
      {/* Sidebar */}
      <div className="no-print" style={{ width: '260px', background: '#1c1e21', color: '#fff', padding: '20px' }}>
        <h2 style={{color: '#4e73df'}}>My POS Pro</h2>
        <div style={{ marginBottom: '20px', color: isOnline ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
          {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>} {isOnline ? 'Online' : 'Offline'}
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setView('pos')} style={navBtn(view==='pos')}><Store size={18}/> အရောင်း (POS)</button>
          <button onClick={() => setView('purchase')} style={navBtn(view==='purchase')}><PlusCircle size={18}/> အဝယ်ဘောင်ချာ</button>
          <button onClick={() => setView('expense')} style={navBtn(view==='expense')}><Wallet size={18}/> အိမ်သုံးစရိတ်</button>
          <button onClick={() => setView('dashboard')} style={navBtn(view==='dashboard')}><LayoutDashboard size={18}/> Dashboard</button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="no-print" style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        {view === 'pos' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                {products.map(p => (
                  <div key={p.id} onClick={() => setCart([...cart, p])} style={cardStyle}>
                    <b>{p.name}</b><br/><span>{p.price} K</span><br/><small>Stock: {p.stock_quantity}</small>
                  </div>
                ))}
              </div>
            </div>
            <div style={cartPanel}>
              <h3>လက်ရှိဘောင်ချာ</h3>
              <div style={{flex: 1}}>{cart.map((c, i) => <div key={i}>{c.name} - {c.price}</div>)}</div>
              <hr/>
              <h4>Total: {cart.reduce((a,b)=>a+b.price,0)} K</h4>
              <button onClick={handleCheckout} style={btnPrimary}>Pay Now</button>
            </div>
          </div>
        )}

        {view === 'purchase' && (
          <div style={formBox}>
            <h3>🛒 အဝယ်ဘောင်ချာသွင်းရန်</h3>
            <form onSubmit={handlePurchase}>
              <select style={inputStyle} value={purchaseForm.productId} onChange={e => setPurchaseForm({...purchaseForm, productId: e.target.value})}>
                <option value="">-- ပစ္စည်းရွေးပါ --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="အရေအတွက်" type="number" style={inputStyle} value={purchaseForm.qty} onChange={e => setPurchaseForm({...purchaseForm, qty: e.target.value})} />
              <input placeholder="ဝယ်စျေးစုစုပေါင်း" type="number" style={inputStyle} value={purchaseForm.cost} onChange={e => setPurchaseForm({...purchaseForm, cost: e.target.value})} />
              <button type="submit" style={btnPrimary}>စာရင်းသွင်းမည်</button>
            </form>
          </div>
        )}

        {view === 'expense' && (
          <div style={formBox}>
            <h3>🏠 အိမ်သုံးစရိတ် မှတ်ရန်</h3>
            <input placeholder="အကြောင်းအရာ" style={inputStyle} value={expenseForm.desc} onChange={e => setExpenseForm({...expenseForm, desc: e.target.value})} />
            <input placeholder="ပမာဏ" type="number" style={inputStyle} value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
            <button onClick={async () => {
              if (isOnline) {
                await supabase.from('expenses').insert([{ description: expenseForm.desc, amount: Number(expenseForm.amount) }]);
                alert("သိမ်းဆည်းပြီးပါပြီ"); setExpenseForm({desc:'', amount:''}); fetchData();
              }
            }} style={btnPrimary}>သိမ်းမည်</button>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={{...dashCard, background: '#4e73df'}}><h4>ယနေ့အရောင်း</h4><h2>{dailySales} K</h2></div>
            <div style={{...dashCard, background: '#e74a3b'}}><h4>ယနေ့အသုံးစရိတ်</h4><h2>{dailyExpenses} K</h2></div>
            <div style={{...dashCard, background: '#1cc88a'}}><h4>အသားတင်အမြတ်</h4><h2>{dailySales - dailyExpenses} K</h2></div>
          </div>
        )}
      </div>

      {/* Print Only Area */}
      <style>{`@media print {.no-print {display:none;} .print-only {display:block !important;}} .print-only {display:none; font-family:monospace; padding:20px;}`}</style>
      <div className="print-only">
        <center><h2>INVOICE</h2><hr/>
        {cart.map((c, i) => <div key={i}>{c.name} ... {c.price} K</div>)}
        <hr/><h3>Total: {cart.reduce((a,b)=>a+b.price,0)} K</h3></center>
      </div>
    </div>
  );
}

const navBtn = (sel) => ({ width: '100%', padding: '12px', textAlign: 'left', background: sel ? '#4e73df' : 'none', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' });
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const cartPanel = { width: '300px', background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' };
const btnPrimary = { width: '100%', padding: '12px', background: '#4e73df', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const formBox = { maxWidth: '400px', background: '#fff', padding: '25px', borderRadius: '15px' };
const dashCard = { padding: '20px', borderRadius: '12px', color: '#fff', textAlign: 'center' };
