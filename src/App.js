import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, Package, BarChart3, Search, Trash2, Edit3, Plus, Minus, Settings, CreditCard, Wallet, Type, Tag } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('pos');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0); // % Discount
  const [font, setFont] = useState('sans-serif'); // Font Selection

  // Modals
  const [modalView, setModalView] = useState(null); // 'product', 'expense', 'purchase'
  const [form, setForm] = useState({});

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*').order('name');
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: e } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    const { data: pur } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
    setExpenses(e || []);
    setPurchases(pur || []);
  }

  // --- Purchase Logic ---
  const handlePurchase = async () => {
    const { error } = await supabase.from('purchases').insert([form]);
    if (!error) {
      await supabase.rpc('handle_purchase', { p_id: form.product_id, quantity_to_add: parseInt(form.qty) });
      setModalView(null); fetchData();
      alert("အဝယ်စာရင်းသွင်းပြီး စတော့တိုးလိုက်ပါပြီ။");
    }
  };

  // --- Expense Logic ---
  const handleExpense = async () => {
    await supabase.from('expenses').insert([form]);
    setModalView(null); fetchData();
  };

  // --- POS Logic with Promotion (%) ---
  const handleCheckout = async () => {
    const subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const total = subtotal - (subtotal * (discount / 100));
    const profit = total - cart.reduce((a, b) => a + ((b.cost_price || 0) * b.qty), 0);

    const { error } = await supabase.from('orders').insert([
      { total_amount: total, device_name: cart.map(i => `${i.name} x${i.qty}`).join(', '), profit }
    ]);

    if (!error) {
      for (const item of cart) await supabase.rpc('handle_checkout', { p_id: item.id, quantity_to_subtract: item.qty });
      setCart([]); setDiscount(0); fetchData();
      alert("အရောင်းဘောင်ချာ ပိတ်ပြီးပါပြီ။");
    }
  };

  return (
    <div style={{ ...container, fontFamily: font }}>
      {/* Odoo Header */}
      <div style={header}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <b style={{ fontSize: '20px' }}>Odoo Master</b>
          <button onClick={() => setView('pos')} style={view === 'pos' ? activeNav : navBtn}><ShoppingCart size={18}/> POS</button>
          <button onClick={() => setView('inventory')} style={view === 'inventory' ? activeNav : navBtn}><Package size={18}/> Inventory</button>
          <button onClick={() => setView('purchase')} style={view === 'purchase' ? activeNav : navBtn}><CreditCard size={18}/> Purchases</button>
          <button onClick={() => setView('accounting')} style={view === 'accounting' ? activeNav : navBtn}><Wallet size={18}/> Expenses</button>
          <button onClick={() => setView('reports')} style={view === 'reports' ? activeNav : navBtn}><BarChart3 size={18}/> Reports</button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Type size={18} />
          <select onChange={(e) => setFont(e.target.value)} style={fontSelect}>
            <option value="sans-serif">Default Font</option>
            <option value="'Pyidaungsu', sans-serif">Pyidaungsu</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Stylish</option>
          </select>
        </div>
      </div>

      <div style={mainBody}>
        {view === 'pos' && (
          <div style={posLayout}>
            {/* Cart with Promotion */}
            <div style={cartPanel}>
              <div style={cartHeader}>New Order</div>
              <div style={cartContent}>
                {cart.map((item, idx) => (
                  <div key={idx} style={cartRow}>
                    <span>{item.name} x {item.qty}</span>
                    <span>{item.price * item.qty} K</span>
                  </div>
                ))}
              </div>
              <div style={cartAction}>
                <div style={promoBox}>
                  <Tag size={16} /> <label>Promotion (%) : </label>
                  <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} style={discountInp} />
                </div>
                <div style={totalDisplay}>
                  <small>Subtotal: {cart.reduce((a,b)=>a+(b.price*b.qty),0)} K</small>
                  <h3>Total: {(cart.reduce((a,b)=>a+(b.price*b.qty),0) * (1 - discount/100)).toLocaleString()} K</h3>
                </div>
                <button onClick={handleCheckout} style={payBtn}>PAYMENT</button>
              </div>
            </div>

            {/* Product Grid */}
            <div style={productArea}>
              <div style={searchBar}><Search size={18}/><input placeholder="Search Products..." onChange={e=>setSearch(e.target.value)} style={searchInp}/></div>
              <div style={grid}>
                {products.filter(p => p.name.includes(search)).map(p => (
                  <div key={p.id} onClick={() => {
                    const existing = cart.find(i => i.id === p.id);
                    if(existing) setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty+1} : i));
                    else setCart([...cart, {...p, qty: 1}]);
                  }} style={pCard}>
                    <div style={pInfo}><b>{p.name}</b><br/><span style={{color:'#00A09D'}}>{p.price} K</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Purchase Tab */}
        {view === 'purchase' && (
          <div style={pageCard}>
            <div style={pageHeader}><h3>Purchase Orders (အဝယ်ဘောင်ချာ)</h3> <button onClick={() => {setForm({}); setModalView('purchase')}} style={odooBtn}>+ New Purchase</button></div>
            <table style={odooTable}>
              <thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Cost</th></tr></thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}><td>{new Date(p.created_at).toLocaleDateString()}</td><td>{p.product_name}</td><td>{p.qty}</td><td>{p.total_cost} K</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Expense Tab */}
        {view === 'accounting' && (
          <div style={pageCard}>
            <div style={pageHeader}><h3>Expenses (အသုံးစရိတ်)</h3> <button onClick={() => {setForm({}); setModalView('expense')}} style={odooBtn}>+ Record Expense</button></div>
            <table style={odooTable}>
              <thead><tr><th>Date</th><th>Category</th><th>Title</th><th>Amount</th></tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}><td>{new Date(e.created_at).toLocaleDateString()}</td><td>{e.category}</td><td>{e.title}</td><td>{e.amount} K</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals for Odoo Features */}
      {modalView && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>{modalView.toUpperCase()}</h3>
            <hr/>
            {modalView === 'purchase' && (
              <>
                <label>Select Product</label>
                <select style={odooInp} onChange={e => {
                  const p = products.find(x => x.id === e.target.value);
                  setForm({...form, product_id: p.id, product_name: p.name});
                }}>
                  <option>-- Select --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label>Quantity</label><input type="number" style={odooInp} onChange={e=>setForm({...form, qty: e.target.value})}/>
                <label>Total Cost</label><input type="number" style={odooInp} onChange={e=>setForm({...form, total_cost: e.target.value})}/>
                <button onClick={handlePurchase} style={saveBtn}>Confirm Purchase</button>
              </>
            )}
            {modalView === 'expense' && (
              <>
                <label>Category</label><input style={odooInp} placeholder="Shop Rent, Electricity, etc." onChange={e=>setForm({...form, category: e.target.value})}/>
                <label>Title</label><input style={odooInp} onChange={e=>setForm({...form, title: e.target.value})}/>
                <label>Amount</label><input type="number" style={odooInp} onChange={e=>setForm({...form, amount: e.target.value})}/>
                <button onClick={handleExpense} style={saveBtn}>Save Expense</button>
              </>
            )}
            <button onClick={() => setModalView(null)} style={cancelBtn}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const container = { height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F2F5' };
const header = { background: '#875A7B', color: 'white', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const navBtn = { background: 'none', border: 'none', color: '#eee', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };
const activeNav = { ...navBtn, background: '#714B67', borderRadius: '4px', color: 'white' };
const mainBody = { flex: 1, overflow: 'hidden' };
const posLayout = { display: 'flex', height: '100%' };
const cartPanel = { width: '400px', background: 'white', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' };
const cartHeader = { padding: '15px', background: '#E9ECEF', fontWeight: 'bold' };
const cartContent = { flex: 1, padding: '15px', overflowY: 'auto' };
const cartAction = { padding: '20px', background: '#F8F9FA', borderTop: '2px solid #ddd' };
const promoBox = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#666' };
const discountInp = { width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' };
const payBtn = { width: '100%', padding: '15px', background: '#00A09D', color: 'white', border: 'none', borderRadius: '4px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' };
const productArea = { flex: 1, padding: '20px', overflowY: 'auto' };
const searchBar = { display: 'flex', background: 'white', padding: '10px', borderRadius: '20px', marginBottom: '20px' };
const searchInp = { border: 'none', outline: 'none', marginLeft: '10px', width: '100%' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' };
const pCard = { background: 'white', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const pInfo = { padding: '5px' };
const pageCard = { margin: '20px', padding: '20px', background: 'white', borderRadius: '8px' };
const pageHeader = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const odooTable = { width: '100%', borderCollapse: 'collapse' };
const odooBtn = { padding: '10px 15px', background: '#875A7B', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const modalBox = { background: 'white', padding: '30px', borderRadius: '8px', width: '400px' };
const odooInp = { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ddd' };
const saveBtn = { width: '100%', padding: '12px', background: '#00A09D', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const cancelBtn = { width: '100%', padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px', cursor: 'pointer' };
const totalDisplay = { textAlign: 'right', marginBottom: '10px' };
const fontSelect = { background: 'none', color: 'white', border: '1px solid #714B67', borderRadius: '4px', padding: '2px' };
