import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ShoppingCart, RefreshCw, Trash2, CreditCard } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchProducts();
    // Real-time Sync: Database ပြောင်းလဲမှုကို စောင့်ကြည့်ရန်
    const channel = supabase.channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*');
    setProducts(data || []);
  }

  const addToCart = (p) => setCart([...cart, { ...p, cartId: Math.random() }]);
  const total = cart.reduce((acc, curr) => acc + curr.price, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("ပစ္စည်းရွေးပါ");
    const { data, error } = await supabase.from('orders').insert([{ total_amount: total }]).select();
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("ရောင်းချမှု အောင်မြင်ပါသည်!");
      setCart([]);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
      <div style={{ flex: 1, padding: '25px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>POS Menu <RefreshCw size={20} onClick={fetchProducts} style={{cursor: 'pointer'}}/></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {products.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} style={{ background: '#fff', padding: '20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{fontSize: '40px'}}>📦</div>
              <b>{p.name}</b><br/>
              <span style={{color: '#2563eb', fontWeight: 'bold'}}>{p.price.toLocaleString()} MMK</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '380px', padding: '25px', background: '#fff', borderLeft: '1px solid #e5e7eb' }}>
        <h3><ShoppingCart /> လက်ရှိပြေစာ</h3>
        <div style={{ height: '60vh', overflowY: 'auto' }}>
          {cart.map(item => (
            <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <span>{item.name}</span>
              <span>{item.price} <Trash2 size={16} color="red" onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))} /></span>
            </div>
          ))}
        </div>
        <hr/>
        <h2 style={{textAlign: 'right'}}>Total: {total.toLocaleString()} MMK</h2>
        <button onClick={handleCheckout} style={{ width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
          <CreditCard /> Pay Now
        </button>
      </div>
    </div>
  );
}
