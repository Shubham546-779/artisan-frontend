import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Star, ChevronLeft, ChevronRight,
  ShoppingCart, Shield, Truck, RefreshCw, Package,
  MapPin, Clock, Award, ArrowRight, Trash2, Plus, Minus,
  Home, PlusCircle, User, Store, Leaf, Sprout, Loader2, AlertCircle, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, tokenStore, ApiError } from './api/api';
import type { Product, Category, Review, ReviewsResponse, ProductDetail } from './api/api';

const N = {
  parchment:'#f5edd6', parchmentD:'#ede0c0', bark:'#6b4c2a', barkL:'#8b6340',
  moss:'#4a5e3a', mossL:'#6b7f55', mossXL:'#d4dbc8', sage:'#9aab85',
  clay:'#b07b52', clayL:'#d4a96a', cream:'#faf6ec', ink:'#2c1f0e',
  inkL:'#5c3d1e', rust:'#a04030', muted:'#8a7560', border:'#c9b899',
  borderD:'#a89070', leaf:'#556b45',
};

const CATEGORIES: Category[] = ['Jewelry','Home Decor','Clothing','Art','Toys','Gifts','Other'];

const clamp = (n: number): React.CSSProperties => ({
  display: '-webkit-box' as React.CSSProperties['display'],
  WebkitLineClamp: n,
  WebkitBoxOrient: 'vertical' as unknown as React.CSSProperties['WebkitBoxOrient'],
  overflow: 'hidden',
});
const masonry = (cols: number): React.CSSProperties => ({
  columnCount: cols as React.CSSProperties['columnCount'],
  columnGap: 22, maxWidth: 1200, margin: '0 auto',
});
const noBreak: React.CSSProperties = { breakInside: 'avoid' as React.CSSProperties['breakInside'], marginBottom: 22 };

interface CatConfig { emoji:string; label:string; tagline:string; accent:string; headerBg:string; stampColor:string; }
const CAT_CONFIG: Record<string, CatConfig> = {
  All:          { emoji:'🌿', label:'All Wares',      tagline:'Every craft from every hand',             accent:'#4a5e3a', headerBg:'transparent', stampColor:'#4a5e3a' },
  Jewelry:      { emoji:'🌙', label:'Jewellery',      tagline:'Stones & metals shaped by patient hands', accent:'#7a6040', headerBg:'#2e2318',      stampColor:'#c9a84c' },
  'Home Decor': { emoji:'🪵', label:'Home & Hearth',  tagline:'Woven, turned & fired with earthy care',  accent:'#8b6340', headerBg:'#3d2810',      stampColor:'#b07b52' },
  Clothing:     { emoji:'🌾', label:'Cloth & Thread', tagline:'Spun from field, dyed with forest',       accent:'#5a6e3a', headerBg:'#2b3820',      stampColor:'#9aab85' },
  Art:          { emoji:'🍂', label:'Folk Art',        tagline:'Painted, printed & pressed by hand',      accent:'#8b4020', headerBg:'#3a1e0e',      stampColor:'#a04030' },
  Toys:         { emoji:'🐿️', label:'Forest Toys',   tagline:'Carved from wood, filled with wonder',    accent:'#5b7a42', headerBg:'#243818',      stampColor:'#7a9e50' },
  Gifts:        { emoji:'🌸', label:'Gift Bundles',   tagline:'Wrapped in wildflower & kindness',         accent:'#8e5060', headerBg:'#3a1820',      stampColor:'#c07888' },
  Other:        { emoji:'🍃', label:'Curios & More',  tagline:'Odd, rare & wonderfully handmade',        accent:'#4a5e50', headerBg:'#1e3028',      stampColor:'#6a8e78' },
};

interface CartItem { product: Product; qty: number; }

const LeafDivider = ({ color = '#6b7f55' }: { color?: string }) => (
  <svg viewBox="0 0 320 24" style={{ width:'100%', height:24 }} fill="none">
    <path d="M0 12 Q40 2 80 12 Q120 22 160 12 Q200 2 240 12 Q280 22 320 12" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" fill="none"/>
    <circle cx="160" cy="12" r="3" fill={color} fillOpacity="0.4"/>
  </svg>
);
const CornerLeaf = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 60 60" style={{ width:60, height:60, ...style }} fill="none">
    <path d="M5 55 Q5 5 55 5" stroke="#6b7f55" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M10 50 Q18 20 35 15 Q20 28 10 50Z" fill="#6b7f55" fillOpacity="0.2"/>
    <circle cx="10" cy="50" r="2" fill="#6b7f55" fillOpacity="0.3"/>
  </svg>
);
const WoodGrain = () => (
  <svg viewBox="0 0 400 100" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.06, pointerEvents:'none' }} preserveAspectRatio="none">
    {[8,18,26,36,46,54,62,72,82,90].map((y,i) => (
      <path key={i} d={`M0 ${y} Q100 ${y+(i%2===0?3:-3)} 200 ${y} Q300 ${y+(i%2===0?-3:3)} 400 ${y}`} stroke="#6b4c2a" strokeWidth="1" fill="none"/>
    ))}
  </svg>
);

function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
      style={{ position:'fixed', bottom:'6rem', left:'50%', transform:'translateX(-50%)', zIndex:9999,
        background: type==='error' ? '#a04030' : '#4a5e3a', color:'#f5edd6', padding:'12px 24px',
        borderRadius:4, fontFamily:'"Cinzel",serif', fontSize:'0.78rem', letterSpacing:'0.1em',
        boxShadow:'0 6px 24px rgba(0,0,0,0.25)', display:'flex', alignItems:'center', gap:10, whiteSpace:'nowrap' }}>
      {type==='error' ? <AlertCircle size={15}/> : '✓'} {msg}
    </motion.div>
  );
}
function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ padding:'80px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
      <Loader2 size={36} color="#4a5e3a" style={{ animation:'spin 1s linear infinite' }}/>
      <p style={{ fontFamily:'"IM Fell English",serif', fontStyle:'italic', fontSize:'1rem', color:'#8a7560' }}>{label}</p>
    </div>
  );
}

// ─── ORDER FORM MODAL ─────────────────────────────────────
interface OrderForm { name:string; email:string; mobile:string; address:string; city:string; pincode:string; }

function OrderFormModal({ cart, onClose, onSuccess }: {
  cart: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const total = cart.reduce((s,i) => s + i.product.price * i.qty, 0);
  const [form, setForm] = useState<OrderForm>({ name:'', email:'', mobile:'', address:'', city:'', pincode:'' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const orderId = `AB-${Date.now().toString(36).toUpperCase()}`;

  const inp: React.CSSProperties = {
    width:'100%', marginTop:5, padding:'10px 12px',
    background:'#f5edd6', border:'1.5px solid #c9b899', borderRadius:2,
    fontSize:'0.9rem', outline:'none', color:'#2c1f0e', fontFamily:'"Crimson Pro",serif',
  };
  const lbl: React.CSSProperties = {
    fontFamily:'"Cinzel",serif', fontSize:'0.6rem', fontWeight:600,
    textTransform:'uppercase', letterSpacing:'0.12em', color:'#8a7560',
  };

  const validate = () => {
    if (!form.name.trim())    return 'Full name is required';
    if (!form.email.trim() || !form.email.includes('@')) return 'Valid email is required';
    if (!form.mobile.trim() || form.mobile.length < 10) return 'Valid mobile number is required';
    if (!form.address.trim()) return 'Address is required';
    if (!form.city.trim())    return 'City is required';
    if (!form.pincode.trim()) return 'Pincode is required';
    return null;
  };

  const placeOrder = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSending(true); setError('');

    const itemsText = cart.map(i =>
      `• ${i.product.name} (x${i.qty}) — Rs.${(i.product.price * i.qty).toFixed(2)}`
    ).join('\n');

    const deliveryAddress = `${form.address}, ${form.city} - ${form.pincode}`;

    try {
      const ejs = (window as any).emailjs;

      // Debug checks
      if (!ejs) {
        setError('EmailJS script not loaded. Check your index.html has the CDN script tag.');
        setSending(false); return;
      }

      const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        setError(`Missing EmailJS keys. Service: ${serviceId ? '✓' : '✗'}  Template: ${templateId ? '✓' : '✗'}  Key: ${publicKey ? '✓' : '✗'}`);
        setSending(false); return;
      }

      const result = await ejs.send(
        serviceId,
        templateId,
        {
          order_id:         orderId,
          customer_name:    form.name,
          customer_email:   form.email,
          to_email:         form.email,
          mobile:           form.mobile,
          order_items:      itemsText,
          order_total:      total.toFixed(2),
          delivery_address: deliveryAddress,
          order_date:       new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }),
        },
        publicKey,
      );

      console.log('EmailJS result:', result);
      onSuccess();
    } catch (e: any) {
      console.error('EmailJS full error:', e);
      const msg = e?.text || e?.message || JSON.stringify(e) || 'Unknown error';
      setError(`Email failed: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:700, background:'rgba(44,31,14,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0' }}>
      <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:30, stiffness:280 }}
        style={{ background:'#faf6ec', borderRadius:'12px 12px 0 0', width:'100%', maxWidth:520, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(44,31,14,0.25)', border:'2px solid #c9b899', borderBottom:'none' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'2px solid #c9b899', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#ede0c0', borderRadius:'10px 10px 0 0', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <WoodGrain/>
          <div style={{ position:'relative', zIndex:1 }}>
            <h2 style={{ fontFamily:'"Cinzel",serif', fontSize:'1rem', fontWeight:700, color:'#5c3d1e', letterSpacing:'0.1em' }}>📦 Delivery Details</h2>
            <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.78rem', color:'#8a7560', marginTop:2 }}>Order {orderId} · ₹{total.toFixed(2)}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#8a7560', position:'relative', zIndex:1 }}><X size={20}/></button>
        </div>

        {/* Form */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {/* Order summary */}
          <div style={{ background:'#f5edd6', border:'1px solid #c9b899', borderRadius:2, padding:'12px', marginBottom:16 }}>
            <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.62rem', color:'#8a7560', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>Order Summary</p>
            {cart.map((item) => (
              <div key={item.product.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <img src={item.product.imageUrl} style={{ width:36, height:36, objectFit:'cover', borderRadius:2, filter:'sepia(8%)' }} alt=""/>
                  <div>
                    <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.82rem', color:'#5c3d1e', lineHeight:1.2 }}>{item.product.name}</p>
                    <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.7rem', color:'#8a7560' }}>x{item.qty}</p>
                  </div>
                </div>
                <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.85rem', fontWeight:600, color:'#4a5e3a' }}>₹{(item.product.price*item.qty).toFixed(2)}</p>
              </div>
            ))}
            <div style={{ borderTop:'1px solid #c9b899', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'"Cinzel",serif', fontSize:'0.72rem', color:'#8a7560', letterSpacing:'0.1em' }}>TOTAL</span>
              <span style={{ fontFamily:'"Cinzel",serif', fontSize:'1.1rem', fontWeight:700, color:'#4a5e3a' }}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Personal details */}
          <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.65rem', color:'#4a5e3a', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <User size={13}/> Personal Details
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
            <div>
              <label style={lbl}>Full Name *</label>
              <input type="text" placeholder="John Doe" value={form.name}
                onChange={(e) => setForm({...form, name:e.target.value})} style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Email *</label>
                <input type="email" placeholder="your@email.com" value={form.email}
                  onChange={(e) => setForm({...form, email:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Mobile *</label>
                <input type="tel" placeholder="9876543210" value={form.mobile}
                  onChange={(e) => setForm({...form, mobile:e.target.value})} style={inp}/>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.65rem', color:'#4a5e3a', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <MapPin size={13}/> Delivery Address
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={lbl}>Street Address *</label>
              <input type="text" placeholder="123, Oak Lane, Near Market" value={form.address}
                onChange={(e) => setForm({...form, address:e.target.value})} style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>City *</label>
                <input type="text" placeholder="Mumbai" value={form.city}
                  onChange={(e) => setForm({...form, city:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Pincode *</label>
                <input type="text" placeholder="400001" value={form.pincode}
                  onChange={(e) => setForm({...form, pincode:e.target.value})} style={inp}/>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(160,64,48,0.1)', border:'1px solid rgba(160,64,48,0.3)', borderRadius:2, display:'flex', alignItems:'center', gap:8 }}>
              <AlertCircle size={14} color="#a04030"/>
              <span style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.88rem', color:'#a04030' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Place Order button */}
        <div style={{ padding:'16px 20px', borderTop:'2px solid #c9b899', background:'#ede0c0', flexShrink:0, position:'relative', overflow:'hidden' }}>
          <WoodGrain/>
          <div style={{ position:'relative', zIndex:1 }}>
            <button className="press" onClick={placeOrder} disabled={sending}
              style={{ width:'100%', padding:'15px', background:sending ? '#8a7560' : '#4a5e3a', color:'#f5edd6', border:'none', borderRadius:2, fontFamily:'"Cinzel",serif', fontSize:'0.8rem', letterSpacing:'0.14em', cursor:sending ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              {sending
                ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }}/> Sending confirmation…</>
                : <>Place Order & Get Confirmation Email <ArrowRight size={15}/></>}
            </button>
            <p style={{ textAlign:'center', fontFamily:'"Crimson Pro",serif', fontSize:'0.72rem', color:'#8a7560', fontStyle:'italic', marginTop:8 }}>
              📧 A confirmation email will be sent to your inbox
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ORDER SUCCESS MODAL ───────────────────────────────────
function OrderSuccessModal({ orderId, email, onClose }: { orderId:string; email:string; onClose:()=>void; }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(44,31,14,0.8)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', stiffness:200, damping:18 }}
        style={{ background:'#faf6ec', border:'2px solid #c9b899', borderRadius:4, padding:'36px 28px', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 16px 60px rgba(44,31,14,0.3)', position:'relative', overflow:'hidden' }}>
        <WoodGrain/>
        <div style={{ position:'relative', zIndex:1 }}>
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.2, type:'spring', stiffness:260 }}
            style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#4a5e3a,#6b7f55)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <span style={{ fontSize:'2rem' }}>✓</span>
          </motion.div>
          <h2 style={{ fontFamily:'"Cinzel",serif', fontSize:'1.4rem', fontWeight:700, color:'#5c3d1e', letterSpacing:'0.06em', marginBottom:8 }}>Order Placed!</h2>
          <p style={{ fontFamily:'"IM Fell English",serif', fontStyle:'italic', color:'#8a7560', fontSize:'0.9rem', marginBottom:20 }}>Your craft is on its way 🌿</p>
          <div style={{ background:'#f5edd6', border:'1px solid #c9b899', borderRadius:2, padding:'14px', marginBottom:20 }}>
            <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.6rem', color:'#8a7560', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>Order ID</p>
            <p style={{ fontFamily:'monospace', fontSize:'1rem', fontWeight:700, color:'#4a5e3a' }}>{orderId}</p>
          </div>
          <div style={{ background:'rgba(74,94,58,0.1)', border:'1px solid rgba(74,94,58,0.25)', borderRadius:2, padding:'12px', marginBottom:24 }}>
            <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.88rem', color:'#5c3d1e' }}>
              📧 A confirmation email has been sent to<br/>
              <strong>{email}</strong>
            </p>
          </div>
          <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.82rem', color:'#8a7560', marginBottom:20, lineHeight:1.6 }}>
            Your order will be dispatched in 3–5 working days. Check your email for full details.
          </p>
          <button className="press" onClick={onClose}
            style={{ width:'100%', padding:'13px', background:'#4a5e3a', color:'#f5edd6', border:'none', borderRadius:2, fontFamily:'"Cinzel",serif', fontSize:'0.75rem', letterSpacing:'0.12em', cursor:'pointer' }}>
            Continue Shopping 🌿
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CartDrawer({ cart, onClose, onUpdateQty, onRemove, onClearCart, showToast }:
  { cart:CartItem[]; onClose:()=>void; onUpdateQty:(id:string,qty:number)=>void; onRemove:(id:string)=>void; onClearCart:()=>void; showToast:(m:string,t?:'success'|'error')=>void; }) {
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ orderId:'', email:'' });

  const orderId = `AB-${Date.now().toString(36).toUpperCase()}`;

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(44,31,14,0.5)', backdropFilter:'blur(2px)' }}
        onClick={onClose}>
        <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', damping:28, stiffness:260 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position:'absolute', top:0, right:0, bottom:0, width:'min(420px,100vw)', background:'#faf6ec', borderLeft:'2px solid #a89070', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(44,31,14,0.2)' }}>
          <div style={{ padding:'18px 20px', borderBottom:'2px solid #c9b899', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#ede0c0', position:'relative', overflow:'hidden' }}>
            <WoodGrain/>
            <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
              <ShoppingCart size={20} color="#4a5e3a"/>
              <h2 style={{ fontFamily:'"Cinzel",serif', fontSize:'1rem', fontWeight:700, color:'#5c3d1e', letterSpacing:'0.1em' }}>Your Basket</h2>
              <span style={{ background:'#4a5e3a', color:'#f5edd6', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"Cinzel",serif', fontSize:'0.65rem', fontWeight:700 }}>{cart.length}</span>
            </div>
            <button onClick={onClose} style={{ background:'transparent', border:'1px solid #c9b899', borderRadius:4, padding:'5px 12px', cursor:'pointer', color:'#8a7560', fontFamily:'"Cinzel",serif', fontSize:'0.62rem', letterSpacing:'0.08em', position:'relative', zIndex:1 }}>← Back</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
            {cart.length === 0 ? (
              <div style={{ padding:'60px 0', textAlign:'center' }}>
                <ShoppingCart size={48} color="#c9b899" style={{ margin:'0 auto 16px', display:'block' }}/>
                <p style={{ fontFamily:'"IM Fell English",serif', fontStyle:'italic', color:'#8a7560', fontSize:'1rem' }}>Your basket is empty</p>
                <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.85rem', color:'#8a7560', marginTop:6 }}>Browse the wares and add items!</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {cart.map((item) => (
                  <div key={item.product.id} style={{ background:'#f5edd6', border:'1.5px solid #c9b899', borderRadius:2, padding:'12px', display:'flex', gap:12, alignItems:'center' }}>
                    <img src={item.product.imageUrl} alt={item.product.name} style={{ width:64, height:64, objectFit:'cover', borderRadius:2, filter:'sepia(8%)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'0.9rem', color:'#5c3d1e', lineHeight:1.3, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.product.name}</p>
                      <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.75rem', color:'#8a7560', marginTop:2 }}>{item.product.sellerName}</p>
                      <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.9rem', fontWeight:600, color:'#4a5e3a', marginTop:4 }}>₹{(item.product.price * item.qty).toFixed(2)}</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'center', border:'1px solid #c9b899', borderRadius:2, overflow:'hidden' }}>
                        <button onClick={() => item.qty > 1 ? onUpdateQty(item.product.id, item.qty-1) : onRemove(item.product.id)}
                          style={{ width:28, height:28, background:'#ede0c0', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Minus size={11}/></button>
                        <span style={{ width:32, textAlign:'center', fontFamily:'"Cinzel",serif', fontSize:'0.8rem', fontWeight:600, color:'#5c3d1e', lineHeight:'28px', borderLeft:'1px solid #c9b899', borderRight:'1px solid #c9b899' }}>{item.qty}</span>
                        <button onClick={() => onUpdateQty(item.product.id, item.qty+1)}
                          style={{ width:28, height:28, background:'#ede0c0', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Plus size={11}/></button>
                      </div>
                      <button onClick={() => onRemove(item.product.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#a04030', padding:4 }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <div style={{ padding:'16px 20px', borderTop:'2px solid #c9b899', background:'#ede0c0', position:'relative', overflow:'hidden' }}>
              <WoodGrain/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <span style={{ fontFamily:'"Cinzel",serif', fontSize:'0.75rem', color:'#8a7560', letterSpacing:'0.1em' }}>TOTAL</span>
                  <span style={{ fontFamily:'"Cinzel",serif', fontSize:'1.5rem', fontWeight:700, color:'#4a5e3a' }}>₹{total.toFixed(2)}</span>
                </div>
                <button className="press" onClick={() => setShowOrderForm(true)}
                  style={{ width:'100%', padding:'14px', background:'#4a5e3a', color:'#f5edd6', border:'none', borderRadius:2, fontFamily:'"Cinzel",serif', fontSize:'0.78rem', letterSpacing:'0.14em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  Proceed to Place Order <ArrowRight size={15}/>
                </button>
                <p style={{ textAlign:'center', fontFamily:'"Crimson Pro",serif', fontSize:'0.72rem', color:'#8a7560', fontStyle:'italic', marginTop:8 }}>Free delivery above ₹50</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Order Form */}
      <AnimatePresence>
        {showOrderForm && (
          <OrderFormModal
            cart={cart}
            onClose={() => setShowOrderForm(false)}
            onSuccess={() => {
              const oid = `AB-${Date.now().toString(36).toUpperCase()}`;
              const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value || '';
              setSuccessData({ orderId: oid, email });
              setShowOrderForm(false);
              setShowSuccess(true);
              onClearCart();
            }}
          />
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <OrderSuccessModal
            orderId={successData.orderId}
            email={successData.email}
            onClose={() => { setShowSuccess(false); onClose(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ShopNameModal({ onConfirm, onClose }: { onConfirm:(s:string)=>void; onClose:()=>void; }) {
  const [shopName, setShopName] = useState('');
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(44,31,14,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
        style={{ background:'#faf6ec', border:'2px solid #c9b899', borderRadius:4, padding:'32px 24px', maxWidth:380, width:'100%', boxShadow:'0 12px 48px rgba(44,31,14,0.25)', position:'relative', overflow:'hidden' }}>
        <WoodGrain/>
        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:12 }}>🏪</div>
          <h2 style={{ fontFamily:'"Cinzel",serif', fontSize:'1.3rem', fontWeight:700, color:'#5c3d1e', letterSpacing:'0.06em', marginBottom:8 }}>Open Your Workshop</h2>
          <p style={{ fontFamily:'"IM Fell English",serif', fontStyle:'italic', color:'#8a7560', fontSize:'0.9rem', marginBottom:24 }}>Give your shop a name to start selling</p>
          <div style={{ textAlign:'left', marginBottom:16 }}>
            <label style={{ fontFamily:'"Cinzel",serif', fontSize:'0.65rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.14em', color:'#8a7560' }}>Shop Name</label>
            <input type="text" placeholder="e.g. My Craft Workshop" value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              onKeyDown={(e) => { if (e.key==='Enter' && shopName.trim()) onConfirm(shopName.trim()); }}
              autoFocus
              style={{ width:'100%', marginTop:7, padding:'11px 14px', background:'#f5edd6', border:'1.5px solid #c9b899', borderRadius:2, fontSize:'0.96rem', outline:'none', color:'#2c1f0e', fontFamily:'"Crimson Pro",serif' }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button className="press" onClick={() => shopName.trim() && onConfirm(shopName.trim())} disabled={!shopName.trim()}
              style={{ padding:'13px', background:shopName.trim() ? '#4a5e3a' : '#8a7560', color:'#f5edd6', border:'none', borderRadius:2, fontFamily:'"Cinzel",serif', fontSize:'0.75rem', letterSpacing:'0.12em', cursor:shopName.trim() ? 'pointer' : 'not-allowed' }}>
              🌿 Open Workshop
            </button>
            <button onClick={onClose} style={{ padding:'11px', background:'transparent', color:'#8a7560', border:'1px solid #c9b899', borderRadius:2, fontFamily:'"Cinzel",serif', fontSize:'0.72rem', letterSpacing:'0.1em', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

type ViewName = 'home'|'sell'|'profile'|'product'|'login';
type NavName  = 'home'|'sell'|'profile'|'login';
interface AppUser { role:'buyer'|'seller'|null; name:string; id:string; }

export function App() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState<boolean>(true);
  const [selectedCat, setSelectedCat] = useState<Category|'All'>('All');
  const [search, setSearch]           = useState<string>('');
  const [debSearch, setDebSearch]     = useState<string>('');
  const [view, setView]               = useState<ViewName>('home');
  const [selProduct, setSelProduct]   = useState<Product|null>(null);
  const [prevView, setPrevView]       = useState<NavName>('home');
  const [user, setUser]               = useState<AppUser>({ role:null, name:'', id:'' });
  const [toast, setToast]             = useState<{ msg:string; type:'success'|'error' }|null>(null);
  const [cart, setCart]               = useState<CartItem[]>(() => {
    try { const saved = localStorage.getItem('ab_cart'); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });
  const [cartOpen, setCartOpen]       = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const showToast = useCallback((msg:string, type:'success'|'error'='success') => setToast({ msg, type }), []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem('ab_cart', JSON.stringify(cart)); }
    catch { /* silent */ }
  }, [cart]);

  useEffect(() => {
    if (tokenStore.get()) {
      api.auth.me().then((u) => setUser({ role:u.role, name:u.shopName??u.name, id:u.id }))
        .catch((e) => { if (e instanceof ApiError && e.status===401) tokenStore.remove(); });
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(timer.current);
  }, [search]);

  useEffect(() => {
    if (view !== 'home') return;
    setLoading(true);
    api.products.list({ category: selectedCat!=='All' ? selectedCat : undefined, search: debSearch||undefined, limit:60 })
      .then((res) => setProducts(res.data))
      .catch(() => showToast('Could not load products','error'))
      .finally(() => setLoading(false));
  }, [selectedCat, debSearch, view, showToast]);

  const addToCart = useCallback((product:Product, qty:number=1) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id===product.id);
      if (ex) return prev.map((i) => i.product.id===product.id ? {...i, qty:i.qty+qty} : i);
      return [...prev, {product, qty}];
    });
    showToast(`${product.name} added to basket! 🛒`);
  }, [showToast]);

  const updateCartQty = useCallback((productId:string, qty:number) => {
    setCart((prev) => prev.map((i) => i.product.id===productId ? {...i, qty} : i));
  }, []);

  const removeFromCart = useCallback((productId:string) => {
    setCart((prev) => prev.filter((i) => i.product.id!==productId));
  }, []);

  const goToProduct = useCallback((p:Product) => {
    setPrevView(view==='product' ? prevView : (view as NavName));
    setSelProduct(p); setView('product');
    window.scrollTo({top:0, behavior:'smooth'});
  }, [view, prevView]);

  const nav = useCallback((v:NavName) => {
    if (v==='sell') {
      if (!user.role) { setView('login'); setSelProduct(null); return; }
      if (user.role!=='seller') { setShowShopModal(true); return; }
    }
    if (v==='profile' && !user.role) { setView('login'); setSelProduct(null); return; }
    setView(v); setSelProduct(null);
  }, [user.role]);

  const handleLogout = useCallback(() => {
    api.auth.logout(); setUser({role:null,name:'',id:''});
    setView('home'); setSelProduct(null); showToast('Signed out');
  }, [showToast]);

  const handleLogin = useCallback((u:{role:'buyer'|'seller';name:string;id:string}) => {
    setUser(u); setView('home'); setSelProduct(null); showToast(`Welcome, ${u.name}!`);
  }, [showToast]);

  const handleShopConfirm = useCallback(async (shopName:string) => {
    setShowShopModal(false);
    try {
      const updated = await api.auth.updateProfile({role:'seller', shopName});
      setUser({role:'seller', name:updated.shopName??updated.name, id:updated.id});
      setView('sell'); showToast('Workshop opened! 🌿');
    } catch { showToast('Could not open workshop','error'); }
  }, [showToast]);

  const cartCount = cart.reduce((s,i) => s+i.qty, 0);

  return (
    <div style={{ minHeight:'100vh', background:'#f5edd6', color:'#2c1f0e', fontFamily:'"Crimson Pro",Georgia,serif', paddingBottom:'5.5rem' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,500&family=IM+Fell+English:ital@0;1&family=Playfair+Display:ital,wght@0,700;0,900;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;}
        .press{transition:transform .12s;cursor:pointer;} .press:active{transform:scale(.97);}
        .lift{transition:transform .25s ease,box-shadow .25s ease;cursor:pointer;} .lift:hover{transform:translateY(-5px);}
        img{display:block;} input,select,textarea{font-family:inherit;}
        @keyframes sway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;opacity:.6;}
        .mobile-search{display:none;}
        @media(max-width:640px){.mobile-search{display:block;} .desktop-search{display:none !important;} .header-tagline{display:none;} .user-name-hdr{max-width:65px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}}
        @media(max-width:480px){.product-detail-split{grid-template-columns:1fr !important;} .product-detail-image-col{position:static !important;border-right:none !important;border-bottom:1.5px solid #c9b899;} .sell-price-cat{grid-template-columns:1fr !important;} .profile-stats-grid{grid-template-columns:repeat(3,1fr) !important;}}
        /* Safe area for notch/status bar */
        :root { --sat: env(safe-area-inset-top); --sab: env(safe-area-inset-bottom); }
        .safe-top { padding-top: env(safe-area-inset-top); }
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>

      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}</AnimatePresence>
      <AnimatePresence>{cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onUpdateQty={updateCartQty} onRemove={removeFromCart} onClearCart={() => setCart([])} showToast={showToast}/>}</AnimatePresence>
      <AnimatePresence>{showShopModal && <ShopNameModal onConfirm={handleShopConfirm} onClose={() => setShowShopModal(false)}/>}</AnimatePresence>

      {/* TOP SAFE AREA — only fills notch/status bar height */}
      <div style={{ background:'#4a5e3a', height:'env(safe-area-inset-top)', minHeight:0, position:'fixed', top:0, left:0, right:0, zIndex:101 }}/>

      {/* HEADER */}
      <header style={{ position:'sticky', top:'env(safe-area-inset-top)', zIndex:100, background:'#ede0c0ee', backdropFilter:'blur(8px)', borderBottom:'2px solid #a89070', boxShadow:'0 3px 16px rgba(44,31,14,0.15)' }}>
        <div style={{ position:'relative', overflow:'hidden' }}>
          <WoodGrain/>
          <div style={{ padding:'0 14px', height:58, display:'flex', alignItems:'center', gap:8, position:'relative', zIndex:1 }}>
            {view==='product' && (
              <button onClick={() => { setView(prevView); setSelProduct(null); }} className="press"
                style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', background:'transparent', border:'1.5px solid #6b4c2a', borderRadius:4, color:'#6b4c2a', fontFamily:'"Cinzel",serif', fontSize:'0.7rem', fontWeight:600, flexShrink:0 }}>
                <ChevronLeft size={13}/> Back
              </button>
            )}
            <div onClick={() => nav('home')} style={{ cursor:'pointer', flexShrink:0, userSelect:'none', display:'flex', alignItems:'center', gap:8 }}>
              <Leaf size={20} color="#4a5e3a"/>
              <div>
                <h1 style={{ fontFamily:'"Cinzel",serif', fontSize:'1.15rem', fontWeight:700, color:'#5c3d1e', letterSpacing:'0.06em', lineHeight:1 }}>Artisan Bazaar</h1>
                <p className="header-tagline" style={{ fontFamily:'"Crimson Pro",serif', fontStyle:'italic', fontSize:'0.65rem', color:'#8a7560', letterSpacing:'0.15em' }}>est. in the old wood</p>
              </div>
            </div>
            {view!=='product' && view!=='login' && (
              <div className="desktop-search" style={{ position:'relative', flex:1, maxWidth:460 }}>
                <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#8a7560' }} size={14}/>
                <input type="text" placeholder="Search the wares…" value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ width:'100%', paddingLeft:38, paddingRight:14, paddingTop:8, paddingBottom:8, background:'rgba(245,237,214,0.6)', border:'1.5px solid #c9b899', borderRadius:4, fontSize:'0.9rem', outline:'none', color:'#2c1f0e' }}/>
              </div>
            )}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              {user.role ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', background:'rgba(74,94,58,0.12)', border:'1px solid rgba(74,94,58,0.3)', borderRadius:4 }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#4a5e3a,#8b6340)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', color:'#f5edd6', fontFamily:'"Cinzel",serif', fontWeight:700, flexShrink:0 }}>{user.name[0]?.toUpperCase()}</div>
                    <div style={{ lineHeight:1.2 }}>
                      <p className="user-name-hdr" style={{ fontFamily:'"Cinzel",serif', fontSize:'0.65rem', color:'#4a5e3a', fontWeight:600 }}>{user.name}</p>
                      <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.58rem', color:'#8a7560' }}>{user.role}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="press" style={{ padding:'5px 8px', background:'transparent', color:'#8a7560', border:'1px solid #c9b899', borderRadius:4, fontFamily:'"Cinzel",serif', fontSize:'0.6rem', cursor:'pointer' }}>Out</button>
                </>
              ) : (
                <button onClick={() => nav('login')} className="press" style={{ padding:'6px 12px', background:'transparent', color:'#4a5e3a', border:'1.5px solid #4a5e3a', borderRadius:4, fontFamily:'"Cinzel",serif', fontSize:'0.68rem', fontWeight:600, cursor:'pointer' }}>Sign In</button>
              )}
              <button onClick={() => setCartOpen(true)} className="press"
                style={{ position:'relative', display:'flex', alignItems:'center', gap:5, padding:'6px 10px', background:'#4a5e3a', color:'#f5edd6', border:'none', borderRadius:4, fontFamily:'"Cinzel",serif', fontSize:'0.68rem', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                <ShoppingCart size={15}/>
                <span className="header-sell-text">Basket</span>
                {cartCount>0 && <span style={{ position:'absolute', top:-5, right:-5, background:'#a04030', color:'#f5edd6', borderRadius:'50%', width:17, height:17, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.58rem', fontWeight:700 }}>{cartCount}</span>}
              </button>
              <button onClick={() => nav('sell')} className="press" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', background:'#ede0c0', color:'#4a5e3a', border:'1.5px solid #4a5e3a', borderRadius:4, fontFamily:'"Cinzel",serif', fontSize:'0.68rem', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                <Sprout size={13}/><span className="header-sell-text">Sell</span>
              </button>
            </div>
          </div>
        </div>
        {view!=='product' && view!=='login' && (
          <div className="mobile-search" style={{ padding:'5px 12px 7px', background:'#ede0c0', borderTop:'1px solid #c9b899' }}>
            <div style={{ position:'relative' }}>
              <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#8a7560' }} size={13}/>
              <input type="text" placeholder="Search the wares…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width:'100%', paddingLeft:32, paddingRight:12, paddingTop:7, paddingBottom:7, background:'rgba(245,237,214,0.8)', border:'1.5px solid #c9b899', borderRadius:4, fontSize:'0.88rem', outline:'none', color:'#2c1f0e' }}/>
            </div>
          </div>
        )}
      </header>

      <main>
        <AnimatePresence mode="wait">
          {view==='home' && (
            <motion.div key="home" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.2}}>
              <HomeView products={products} loading={loading} selectedCat={selectedCat} setSelectedCat={setSelectedCat} onProduct={goToProduct} onAddToCart={addToCart}/>
            </motion.div>
          )}
          {view==='sell' && (
            <motion.div key="sell" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <div style={{padding:'32px 16px'}}>
                <SellView onAdd={async (p) => {
                  try { await api.products.create(p); showToast('Craft listed! ✦'); setView('home'); }
                  catch (e) { showToast(e instanceof ApiError ? e.message : 'Failed to list','error'); }
                }}/>
              </div>
            </motion.div>
          )}
          {view==='profile' && (
            <motion.div key="profile" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <div style={{padding:'32px 16px'}}>
                <ProfileView user={user} onProduct={goToProduct} onLogout={handleLogout}/>
              </div>
            </motion.div>
          )}
          {view==='login' && (
            <motion.div key="login" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <LoginView onLogin={handleLogin}/>
            </motion.div>
          )}
          {view==='product' && selProduct && (
            <motion.div key={`pd-${selProduct.id}`} initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.22}}>
              <ProductDetailView product={selProduct} onProduct={goToProduct} isOwn={selProduct.sellerId===user.id} onAddToCart={addToCart} showToast={showToast}/>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM NAV */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#ede0c0f0', backdropFilter:'blur(10px)', borderTop:'2px solid #a89070', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
        <div style={{ display:'flex', justifyContent:'space-around', maxWidth:480, margin:'0 auto', padding:'4px 0' }}>
          {([
            {v:'home' as NavName, icon:<Home size={20}/>, label:'🌿 Home'},
            {v:'sell' as NavName, icon:<PlusCircle size={20}/>, label:'✦ Sell'},
            {v:'cart' as NavName, icon:<ShoppingCart size={20}/>, label:'🛒 Cart'},
            {v:'profile' as NavName, icon:<User size={20}/>, label:'🍃 Me'},
          ]).map(({v, icon, label}) => {
            const active = view===v || (view==='product' && v==='home') || (showShopModal && v==='sell');
            const isCart = v==='cart';
            return (
              <button key={v} onClick={() => isCart ? setCartOpen(true) : nav(v)} className="press"
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'5px 14px', background:'none', border:'none', color:active ? '#4a5e3a' : '#8a7560', position:'relative' }}>
                <div style={{ padding:'4px 10px', borderRadius:3, background:active ? 'rgba(74,94,58,0.13)' : 'transparent', border:active ? '1px solid rgba(74,94,58,0.33)' : '1px solid transparent' }}>
                  {React.cloneElement(icon as React.ReactElement<{strokeWidth:number}>, {strokeWidth:active?2.5:1.8})}
                </div>
                <span style={{ fontSize:'0.58rem', fontFamily:'"Cinzel",serif', letterSpacing:'0.08em', fontWeight:active?700:400 }}>{label}</span>
                {isCart && cartCount>0 && <span style={{ position:'absolute', top:2, right:6, background:'#a04030', color:'#f5edd6', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:700 }}>{cartCount}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ─── HOME VIEW ─────────────────────────────────────────────
type GridProps = {products:Product[]; onProduct:(p:Product)=>void; onAddToCart:(p:Product,qty?:number)=>void;};

function HomeView({products,loading,selectedCat,setSelectedCat,onProduct,onAddToCart}:
  GridProps & {loading:boolean; selectedCat:Category|'All'; setSelectedCat:(c:Category|'All')=>void;}) {
  return (
    <div>
      <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(170deg,#1e2e18,#2e4020,#1a2810)',padding:'40px 20px 36px'}}>
        <WoodGrain/>
        <div style={{position:'absolute',top:-10,right:-10,opacity:.18}}>
          <svg viewBox="0 0 200 200" style={{width:160}} fill="#9aab85">
            <path d="M180 20 Q100 10 20 180 Q80 80 180 20Z"/>
            <path d="M160 40 Q90 30 30 160 Q85 90 160 40Z" opacity=".5"/>
          </svg>
        </div>
        <div style={{position:'relative',zIndex:1,maxWidth:800,margin:'0 auto',textAlign:'center'}}>
          <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',fontSize:'0.85rem',color:'#9aab85cc',letterSpacing:'0.15em',marginBottom:10}}>~ handcrafted with love & nature ~</p>
          <h1 style={{fontFamily:'"Cinzel",serif',fontSize:'clamp(1.8rem,5vw,3.8rem)',fontWeight:700,color:'#f5edd6',lineHeight:1.15,letterSpacing:'0.04em'}}>Artisan Bazaar</h1>
          <LeafDivider color="#9aab85"/>
          <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'1rem',color:'#ede0c0bb',marginTop:8,lineHeight:1.7,maxWidth:560,margin:'8px auto 0'}}>
            A marketplace rooted in tradition — where every item is made by hand, shaped by the earth.
          </p>
          <div style={{marginTop:22,display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap'}}>
            {[['70+','Wares'],['18k+','Patrons'],['4.9★','Esteem'],['100%','Handmade']].map(([v,l]) => (
              <div key={l}>
                <p style={{fontFamily:'"Cinzel",serif',fontSize:'1.2rem',fontWeight:700,color:'#d4a96a'}}>{v}</p>
                <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.72rem',color:'#9aab8599',letterSpacing:'0.12em',textTransform:'uppercase'}}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:'#ede0c0',borderBottom:'2px solid #a89070',padding:'0 12px',overflowX:'auto'}} className="scrollbar-hide">
        <div style={{display:'flex',minWidth:'max-content'}}>
          {(['All',...CATEGORIES] as (Category|'All')[]).map((cat) => {
            const cc=CAT_CONFIG[cat]; const active=selectedCat===cat;
            return (
              <button key={cat} onClick={() => setSelectedCat(cat)} className="press"
                style={{padding:'12px 14px',whiteSpace:'nowrap',fontFamily:'"Cinzel",serif',fontSize:'0.68rem',fontWeight:600,letterSpacing:'0.08em',border:'none',borderBottom:active ? `2.5px solid ${cc.accent}` : '2.5px solid transparent',background:'none',color:active ? cc.accent : '#8a7560',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                {cc.emoji} {cc.label}
              </button>
            );
          })}
        </div>
      </div>
      <AnimatePresence mode="wait">
        {selectedCat!=='All' && (
          <motion.div key={selectedCat} initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} transition={{duration:.3}}>
            <div style={{background:CAT_CONFIG[selectedCat].headerBg,position:'relative',overflow:'hidden',padding:'28px 20px'}}>
              <WoodGrain/>
              <div style={{position:'absolute',top:0,left:0}}><CornerLeaf/></div>
              <div style={{position:'absolute',top:0,right:0,transform:'scaleX(-1)'}}><CornerLeaf/></div>
              <div style={{position:'relative',zIndex:1,textAlign:'center',maxWidth:700,margin:'0 auto'}}>
                <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'clamp(1.4rem,3vw,2.6rem)',fontWeight:700,color:'#f5edd6',letterSpacing:'0.08em'}}>{CAT_CONFIG[selectedCat].label}</h2>
                <div style={{margin:'10px auto',width:180}}><LeafDivider color={CAT_CONFIG[selectedCat].stampColor}/></div>
                <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',fontSize:'0.95rem',color:'#f5edd688'}}>{CAT_CONFIG[selectedCat].tagline}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? <Spinner label="Gathering wares from the forest…"/> : (
        <AnimatePresence mode="wait">
          <motion.div key={selectedCat} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.25}}>
            {products.length===0 ? (
              <div style={{padding:'80px 0',textAlign:'center',color:'#8a7560'}}>
                <Leaf size={48} style={{margin:'0 auto 16px',opacity:.2,display:'block'}} color="#4a5e3a"/>
                <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',fontSize:'1.1rem'}}>No wares found in the forest…</p>
              </div>
            ) : <DefaultGrid products={products} onProduct={onProduct} onAddToCart={onAddToCart}/>}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function DefaultGrid({products,onProduct,onAddToCart}:GridProps) {
  return (
    <div style={{padding:'24px 14px 44px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:18}}>
      {products.map((p,i) => (
        <motion.div key={p.id} className="lift" onClick={() => onProduct(p)}
          initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.025,.5)}}
          style={{background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2,overflow:'hidden',boxShadow:'0 4px 18px rgba(44,31,14,0.1)'}}>
          <div style={{aspectRatio:'4/3',overflow:'hidden',position:'relative',background:'#ede0c0'}}>
            <img src={p.imageUrl} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:'sepia(8%)',transition:'transform .4s'}}
              onMouseEnter={(e) => {(e.currentTarget as HTMLImageElement).style.transform='scale(1.08)';}}
              onMouseLeave={(e) => {(e.currentTarget as HTMLImageElement).style.transform='scale(1)';}}/>
            <div style={{position:'absolute',bottom:8,left:8,background:'#6b4c2add',padding:'2px 8px',border:'1px solid #b07b5244'}}>
              <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.5rem',color:'#d4a96a',letterSpacing:'0.12em'}}>{p.category.toUpperCase()}</p>
            </div>
          </div>
          <div style={{padding:'11px 12px 13px',borderTop:'1.5px solid #c9b899'}}>
            <h3 style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'0.92rem',fontWeight:400,color:'#5c3d1e',marginBottom:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{p.name}</h3>
            <p style={{fontFamily:'"Crimson Pro",serif',fontStyle:'italic',fontSize:'0.72rem',color:'#8a7560',marginBottom:8,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.sellerName}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontFamily:'"Cinzel",serif',fontSize:'1rem',fontWeight:600,color:'#4a5e3a'}}>₹{p.price}</span>
            </div>
            <button className="press" onClick={(e) => {e.stopPropagation(); onAddToCart(p);}}
              style={{width:'100%',padding:'8px',background:'#4a5e3a',color:'#f5edd6',border:'none',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.65rem',letterSpacing:'0.1em',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <ShoppingCart size={13}/> Add to Basket
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProductDetailView({product:init,onProduct,isOwn,onAddToCart,showToast}:
  {product:Product; onProduct:(p:Product)=>void; isOwn:boolean; onAddToCart:(p:Product,qty:number)=>void; showToast:(m:string,t?:'success'|'error')=>void;}) {
  const [product,setProduct]=useState<Product>(init);
  const [related,setRelated]=useState<Product[]>([]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [avgRating,setAvgRating]=useState<string|null>(null);
  const [qty,setQty]=useState(1);
  const [cartDone,setCartDone]=useState(false);
  const cc=CAT_CONFIG[product.category];
  const displayRating=avgRating??(product.rating ? product.rating.toFixed(1) : '4.5');

  useEffect(() => {
    Promise.all([api.products.get(product.id) as Promise<ProductDetail>, api.reviews.forProduct(product.id) as Promise<ReviewsResponse>])
      .then(([detail,rev]) => {setProduct(detail);setRelated(detail.related??[]);setReviews(rev.data);setAvgRating(rev.avgRating);})
      .catch(() => {});
  },[product.id]);

  return (
    <div>
      <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:6,background:'#ede0c0',borderBottom:'1px solid #c9b899',fontSize:'0.75rem',color:'#8a7560',fontFamily:'"Crimson Pro",serif',overflowX:'auto'}} className="scrollbar-hide">
        <span style={{color:'#4a5e3a',whiteSpace:'nowrap'}}>Home</span><ChevronRight size={11}/>
        <span style={{color:'#4a5e3a',whiteSpace:'nowrap'}}>{product.category}</span><ChevronRight size={11}/>
        <span style={{fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{product.name}</span>
      </div>
      <div className="product-detail-split" style={{display:'grid',gridTemplateColumns:'55% 45%',minHeight:'70vh'}}>
        <div className="product-detail-image-col" style={{padding:'28px 20px',position:'sticky',top:68,alignSelf:'start',borderRight:'1.5px solid #c9b899'}}>
          <div style={{padding:8,background:'linear-gradient(145deg,#c9a84c44,#8b602044)',boxShadow:'0 8px 32px rgba(44,31,14,0.2)'}}>
            <div style={{padding:3,background:'linear-gradient(145deg,#8b6030,#6b4020)'}}>
              <div style={{aspectRatio:'1',overflow:'hidden'}}>
                <img src={product.imageUrl} alt={product.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:'sepia(8%) contrast(1.05)'}}/>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:'24px 16px 28px',display:'flex',flexDirection:'column',gap:16,position:'relative'}}>
          <WoodGrain/>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'3px 12px',background:'#6b4c2a22',border:'1px solid #c9b899',borderRadius:1,marginBottom:10}}>
              <span style={{fontSize:'0.75rem'}}>{cc.emoji}</span>
              <span style={{fontFamily:'"Cinzel",serif',fontSize:'0.58rem',color:'#8b6340',letterSpacing:'0.14em',textTransform:'uppercase'}}>{product.category}</span>
            </div>
            <h1 style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'clamp(1.3rem,2.5vw,2.2rem)',fontWeight:400,color:'#5c3d1e',lineHeight:1.25}}>{product.name}</h1>
            <LeafDivider color="#c9b899"/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,position:'relative',zIndex:1,flexWrap:'wrap'}}>
            {[1,2,3,4,5].map((s) => <Star key={s} size={13} fill={s<=Math.round(parseFloat(displayRating))?'#c9a84c':'none'} color={s<=Math.round(parseFloat(displayRating))?'#c9a84c':'#c9b899'}/>)}
            <span style={{fontFamily:'"Cinzel",serif',fontSize:'0.8rem',color:'#8b6020',fontWeight:600}}>{displayRating}</span>
            <span style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.78rem',color:'#8a7560',fontStyle:'italic'}}>({reviews.length||0} reviews)</span>
          </div>
          <div style={{padding:'14px 16px',background:'#ede0c0',border:'1.5px solid #c9b899',borderRadius:2,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',position:'relative',zIndex:1}}>
            <span style={{fontFamily:'"Cinzel",serif',fontSize:'1.8rem',fontWeight:700,color:'#4a5e3a'}}>₹{product.price}</span>
            <div>
              <span style={{fontSize:'0.85rem',color:'#8a7560',textDecoration:'line-through',display:'block',fontFamily:'"Crimson Pro",serif'}}>₹{Math.round(product.price*1.2)}</span>
              <span style={{fontFamily:'"Cinzel",serif',fontSize:'0.6rem',color:'#556b45',letterSpacing:'0.1em'}}>17% SAVED</span>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2,position:'relative',zIndex:1}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#4a5e3a,#556b45)',display:'flex',alignItems:'center',justifyContent:'center',color:'#f5edd6',fontFamily:'"Cinzel",serif',fontWeight:700,flexShrink:0}}>{product.sellerName[0]}</div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.58rem',color:'#8a7560',letterSpacing:'0.12em',textTransform:'uppercase'}}>Craftsperson</p>
              <p style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'0.95rem',color:'#5c3d1e'}}>{product.sellerName}</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 10px',background:'rgba(74,94,58,0.13)',border:'1px solid rgba(74,94,58,0.33)',borderRadius:1}}>
              <Award size={11} color="#4a5e3a"/><span style={{fontFamily:'"Cinzel",serif',fontSize:'0.58rem',color:'#4a5e3a'}}>Verified</span>
            </div>
          </div>
          <div style={{padding:'12px 14px',background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2,display:'flex',flexDirection:'column',gap:8,position:'relative',zIndex:1}}>
            {([[<Truck size={13}/>, 'Free delivery above ₹50'],[<Clock size={13}/>, 'Dispatched in 3–5 days'],[<MapPin size={13}/>, 'Made & shipped from India']] as [React.ReactNode,string][]).map(([icon,text],idx) => (
              <div key={idx} style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{color:'#6b7f55',flexShrink:0}}>{icon}</span>
                <span style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.83rem',color:'#5c3d1e'}}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1}}>
            <span style={{fontFamily:'"Cinzel",serif',fontSize:'0.68rem',color:'#8a7560',letterSpacing:'0.1em'}}>QTY</span>
            <div style={{display:'flex',alignItems:'center',border:'1.5px solid #c9b899',borderRadius:2,overflow:'hidden'}}>
              <button onClick={() => setQty((q) => Math.max(1,q-1))} style={{width:36,height:36,background:'#ede0c0',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={13}/></button>
              <span style={{width:44,textAlign:'center',fontSize:'1rem',fontFamily:'"Cinzel",serif',fontWeight:600,color:'#5c3d1e',borderLeft:'1.5px solid #c9b899',borderRight:'1.5px solid #c9b899',lineHeight:'36px'}}>{qty}</span>
              <button onClick={() => setQty((q) => q+1)} style={{width:36,height:36,background:'#ede0c0',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={13}/></button>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10,position:'relative',zIndex:1}}>
            {!isOwn ? (
              <>
                <button className="press" onClick={() => {setCartDone(true);setTimeout(()=>setCartDone(false),2500);onAddToCart(product,qty);}}
                  style={{padding:'12px',background:cartDone?'#556b45':'#ede0c0',color:cartDone?'#f5edd6':'#4a5e3a',border:'2px solid #4a5e3a',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.72rem',letterSpacing:'0.12em',transition:'all .25s',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <ShoppingCart size={15}/> {cartDone ? '✓ Added to Basket' : 'Add to Basket'}
                </button>
                <button className="press" onClick={() => {onAddToCart(product,qty);showToast('Added! Check your basket 🛒');}}
                  style={{padding:'12px',background:'#4a5e3a',color:'#f5edd6',border:'none',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.72rem',letterSpacing:'0.12em'}}>
                  Buy Now — ₹{(product.price*qty).toFixed(2)}
                </button>
              </>
            ) : (
              <div style={{padding:'12px',background:'rgba(74,94,58,0.13)',border:'1.5px solid rgba(74,94,58,0.33)',borderRadius:2,textAlign:'center',fontFamily:'"Cinzel",serif',fontSize:'0.68rem',color:'#4a5e3a',letterSpacing:'0.1em'}}>✦ This is your listing</div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,position:'relative',zIndex:1}}>
            {[{icon:<Shield size={17}/>,t:'Secure',d:'SSL checkout'},{icon:<RefreshCw size={17}/>,t:'7-Day Return',d:'Easy returns'},{icon:<Package size={17}/>,t:'Gift Wrap',d:'Free'}].map(({icon,t,d}) => (
              <div key={t} style={{background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2,padding:'10px 6px',textAlign:'center'}}>
                <div style={{color:'#6b7f55',display:'flex',justifyContent:'center',marginBottom:4}}>{icon}</div>
                <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.6rem',fontWeight:600,color:'#5c3d1e'}}>{t}</p>
                <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.65rem',color:'#8a7560',marginTop:1,fontStyle:'italic'}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{padding:'32px 16px',borderTop:'2px solid #c9b899',background:'#faf6ec',position:'relative'}}>
        <WoodGrain/>
        <div style={{maxWidth:900,margin:'0 auto',position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <Leaf size={16} color="#4a5e3a"/>
            <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'1rem',fontWeight:600,color:'#5c3d1e',letterSpacing:'0.1em'}}>About This Piece</h2>
          </div>
          <LeafDivider color="#c9b899"/>
          <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'1rem',lineHeight:1.9,color:'#5c3d1e',marginTop:14}}>{product.description}</p>
        </div>
      </div>
      {reviews.length>0 && (
        <div style={{padding:'28px 16px 40px',borderTop:'2px solid #c9b899',background:'#f5edd6'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18,flexWrap:'wrap'}}>
              <Star size={16} color="#4a5e3a" fill="#4a5e3a"/>
              <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'0.95rem',fontWeight:600,color:'#5c3d1e',letterSpacing:'0.1em'}}>Patron Reviews</h2>
              <span style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.85rem',color:'#8a7560',fontStyle:'italic'}}>— {avgRating??'—'} avg · {reviews.length} reviews</span>
            </div>
            <LeafDivider color="#c9b899"/>
            <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:14}}>
              {reviews.map((r) => (
                <div key={r.id} style={{padding:'16px 18px',background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#4a5e3a,#8b6340)',display:'flex',alignItems:'center',justifyContent:'center',color:'#f5edd6',fontFamily:'"Cinzel",serif',fontSize:'0.75rem',fontWeight:700}}>{r.buyerName[0]}</div>
                    <div>
                      <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.68rem',color:'#5c3d1e',fontWeight:600}}>{r.buyerName}</p>
                      <div style={{display:'flex',gap:2,marginTop:2}}>{[1,2,3,4,5].map((s) => <Star key={s} size={10} fill={s<=r.rating?'#c9a84c':'none'} color={s<=r.rating?'#c9a84c':'#c9b899'}/>)}</div>
                    </div>
                    <span style={{marginLeft:'auto',fontFamily:'"Crimson Pro",serif',fontSize:'0.72rem',color:'#8a7560',fontStyle:'italic'}}>{new Date(r.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</span>
                  </div>
                  {r.comment && <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.92rem',color:'#5c3d1e',lineHeight:1.7,fontStyle:'italic'}}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {related.length>0 && (
        <div style={{padding:'32px 16px 50px',borderTop:'2px solid #c9b899'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
            <Sprout size={16} color="#4a5e3a"/>
            <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'0.95rem',fontWeight:600,color:'#5c3d1e',letterSpacing:'0.1em'}}>More from {product.category}</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:16}}>
            {related.map((p) => (
              <div key={p.id} className="lift" onClick={() => onProduct(p)} style={{background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2,overflow:'hidden',cursor:'pointer'}}>
                <div style={{aspectRatio:'4/3',overflow:'hidden',background:'#ede0c0'}}>
                  <img src={p.imageUrl} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:'sepia(8%)',transition:'transform .35s'}}
                    onMouseEnter={(e) => {(e.currentTarget as HTMLImageElement).style.transform='scale(1.07)';}}
                    onMouseLeave={(e) => {(e.currentTarget as HTMLImageElement).style.transform='scale(1)';}}/>
                </div>
                <div style={{padding:'10px 12px 12px',borderTop:'1px solid #c9b899'}}>
                  <h3 style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'0.88rem',fontWeight:400,color:'#5c3d1e',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.name}</h3>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                    <span style={{fontFamily:'"Cinzel",serif',fontSize:'0.95rem',color:'#4a5e3a',fontWeight:600}}>₹{p.price}</span>
                    <span style={{fontFamily:'"Crimson Pro",serif',fontStyle:'italic',fontSize:'0.72rem',color:'#8a7560'}}>{p.sellerName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IMAGE UPLOADER ────────────────────────────────────────
function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(value);
  const [error, setError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadToImgBB = async (file: File) => {
    setUploading(true); setError('');
    try {
      // Always use base64 preview first for instant display
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        onChange(dataUrl);
      };
      reader.readAsDataURL(file);

      // Try ImgBB upload for a permanent URL
      const formData = new FormData();
      formData.append('image', file);
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || 'c2d3f5d7f9e1a3b5c7d9e1f3';
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const url = data.data.url;
        setPreview(url);
        onChange(url);
      }
      // If ImgBB fails, base64 from FileReader above is already set
    } catch {
      // base64 fallback already handled above
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be less than 5MB'); return; }
    uploadToImgBB(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) uploadToImgBB(file);
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*"
        onChange={handleFile} style={{ display:'none' }}/>

      {preview ? (
        <div style={{ position:'relative', borderRadius:2, overflow:'hidden', border:'1.5px solid #c9b899' }}>
          <img src={preview} alt="Preview" style={{ width:'100%', height:200, objectFit:'cover', display:'block', filter:'sepia(8%)' }}/>
          <div style={{ position:'absolute', inset:0, background:'rgba(44,31,14,0)', transition:'background .2s' }}/>
          <button onClick={() => { setPreview(''); onChange(''); if (fileRef.current) fileRef.current.value = ''; }}
            style={{ position:'absolute', top:8, right:8, background:'rgba(160,64,48,0.9)', border:'none', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#f5edd6' }}>
            <X size={15}/>
          </button>
          <button onClick={() => fileRef.current?.click()}
            style={{ position:'absolute', bottom:8, right:8, background:'rgba(74,94,58,0.9)', border:'none', borderRadius:2, padding:'6px 12px', cursor:'pointer', color:'#f5edd6', fontFamily:'"Cinzel",serif', fontSize:'0.6rem', letterSpacing:'0.1em' }}>
            Change
          </button>
          {uploading && (
            <div style={{ position:'absolute', inset:0, background:'rgba(245,237,214,0.8)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <Loader2 size={20} color="#4a5e3a" style={{ animation:'spin 1s linear infinite' }}/>
              <span style={{ fontFamily:'"Cinzel",serif', fontSize:'0.72rem', color:'#4a5e3a' }}>Uploading…</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{ border:'2px dashed #c9b899', borderRadius:2, padding:'32px 20px', textAlign:'center', cursor:'pointer', background:'#f5edd6', transition:'border-color .2s, background .2s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor='#4a5e3a'; (e.currentTarget as HTMLDivElement).style.background='#f0ead6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor='#c9b899'; (e.currentTarget as HTMLDivElement).style.background='#f5edd6'; }}>
          {uploading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <Loader2 size={32} color="#4a5e3a" style={{ animation:'spin 1s linear infinite' }}/>
              <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.72rem', color:'#4a5e3a', letterSpacing:'0.1em' }}>Uploading image…</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              {/* Upload icon */}
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8a7560" strokeWidth="1.2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <div>
                <p style={{ fontFamily:'"Cinzel",serif', fontSize:'0.78rem', fontWeight:600, color:'#5c3d1e', letterSpacing:'0.08em' }}>
                  📁 Gallery / Camera / PC Folder
                </p>
                <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.82rem', color:'#8a7560', marginTop:4 }}>
                  Tap to choose · or drag & drop from PC
                </p>
                <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.75rem', color:'#a89070', marginTop:4, fontStyle:'italic' }}>
                  JPG, PNG, WEBP · Max 5MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.82rem', color:'#a04030', marginTop:6 }}>{error}</p>}
    </div>
  );
}

function SellView({onAdd}:{onAdd:(p:Partial<Product>)=>Promise<void>;}) {
  const [f,setF]=useState({name:'',description:'',price:'',category:'Other' as Category,imageUrl:''});
  const [submitting,setSubmitting]=useState(false);
  const inp:React.CSSProperties={width:'100%',marginTop:7,padding:'11px 14px',background:'#f5edd6',border:'1.5px solid #c9b899',borderRadius:2,fontSize:'0.96rem',outline:'none',color:'#2c1f0e',fontFamily:'"Crimson Pro",serif'};
  const lbl:React.CSSProperties={fontFamily:'"Cinzel",serif',fontSize:'0.65rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.14em',color:'#8a7560'};
  const handle=async () => {
    if (!f.name||!f.price||!f.imageUrl) return;
    setSubmitting(true);
    try { await onAdd({...f,price:Number(f.price)}); } finally { setSubmitting(false); }
  };
  return (
    <div style={{maxWidth:580,margin:'0 auto'}}>
      <div style={{textAlign:'center',marginBottom:28}}>
        <Leaf size={26} color="#4a5e3a" style={{margin:'0 auto 10px',display:'block'}}/>
        <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'1.6rem',fontWeight:700,color:'#5c3d1e',letterSpacing:'0.08em'}}>List a New Craft</h2>
        <LeafDivider color="#c9b899"/>
        <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',color:'#8a7560',marginTop:6}}>Share your handmade wares with the world</p>
      </div>
      <div style={{background:'#faf6ec',border:'2px solid #c9b899',borderRadius:2,padding:'28px 20px',boxShadow:'0 6px 28px rgba(44,31,14,0.1)',position:'relative',overflow:'hidden'}}>
        <WoodGrain/>
        <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',gap:18}}>
          <div><label style={lbl}>Item Name</label><input type="text" placeholder="e.g. Hand-carved Wooden Spoon" value={f.name} onChange={(e) => setF({...f,name:e.target.value})} style={inp}/></div>

          {/* IMAGE UPLOAD */}
          <div>
            <label style={lbl}>Product Image</label>
            <div style={{marginTop:7}}>
              <ImageUploader value={f.imageUrl} onChange={(url) => setF({...f, imageUrl:url})}/>
            </div>
            {!f.imageUrl && <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.78rem',color:'#a04030',marginTop:6}}>* Image is required</p>}
          </div>

          <div className="sell-price-cat" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={lbl}>Price (₹)</label><input type="number" placeholder="0.00" value={f.price} onChange={(e) => setF({...f,price:e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Category</label>
              <select value={f.category} onChange={(e) => setF({...f,category:e.target.value as Category})} style={inp}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>Description</label><textarea rows={4} placeholder="Describe your craft…" value={f.description} onChange={(e) => setF({...f,description:e.target.value})} style={{...inp,resize:'vertical'}}/></div>
          <button className="press" onClick={handle} disabled={submitting||!f.imageUrl}
            style={{padding:'14px',background:(submitting||!f.imageUrl)?'#8a7560':'#4a5e3a',color:'#f5edd6',border:'none',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.78rem',letterSpacing:'0.14em',display:'flex',alignItems:'center',justifyContent:'center',gap:10,cursor:(submitting||!f.imageUrl)?'not-allowed':'pointer'}}>
            {submitting ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Listing…</> : <>List Your Craft <ArrowRight size={15}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileView({user,onProduct,onLogout}:{user:AppUser;onProduct:(p:Product)=>void;onLogout:()=>void;}) {
  const [myProducts,setMyProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [deletingId,setDeletingId]=useState<string|null>(null);
  const [confirmId,setConfirmId]=useState<string|null>(null);
  const isSeller=user.role==='seller';

  useEffect(() => {
    setLoading(true);
    if (isSeller&&user.id) { api.products.bySeller(user.id).then((r) => setMyProducts(r.data)).catch(()=>{}).finally(()=>setLoading(false)); }
    else { setLoading(false); }
  },[user.id,isSeller]);

  const handleDelete=async (productId:string,e:React.MouseEvent) => {
    e.stopPropagation();
    if (confirmId!==productId) { setConfirmId(productId); return; }
    setDeletingId(productId); setConfirmId(null);
    try { await api.products.delete(productId); setMyProducts((prev) => prev.filter((p) => p.id!==productId)); }
    catch {} finally { setDeletingId(null); }
  };

  return (
    <div style={{maxWidth:960,margin:'0 auto'}}>
      <div style={{background:'#faf6ec',border:'2px solid #c9b899',borderRadius:2,padding:'20px 16px',marginBottom:24,position:'relative',overflow:'hidden',boxShadow:'0 6px 24px rgba(44,31,14,0.1)'}}>
        <WoodGrain/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#4a5e3a,#8b6340)',display:'flex',alignItems:'center',justifyContent:'center',border:'3px solid #a89070',flexShrink:0}}>
            <User size={34} color="#f5edd6"/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'1.4rem',fontWeight:700,color:'#5c3d1e',letterSpacing:'0.06em'}}>{isSeller ? 'My Workshop' : 'My Profile'}</h2>
            <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',color:'#8a7560',marginTop:3,fontSize:'0.9rem'}}>{user.name} · {user.role}</p>
            <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.72rem',color:'#8a7560',marginTop:3,letterSpacing:'0.02em'}}>🪪 ID: <span style={{fontFamily:'monospace',fontSize:'0.68rem'}}>{user.id}</span></p>
          </div>
          <button onClick={onLogout} className="press" style={{padding:'8px 16px',border:'1.5px solid #c9b899',background:'transparent',color:'#4a5e3a',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.72rem',cursor:'pointer',fontWeight:600}}>Logout</button>
        </div>
      </div>
      {isSeller && (
        <>
          <div className="profile-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
            {[['Items Listed',myProducts.length],['Pieces Sold',24],['Patrons',142]].map(([label,val]) => (
              <div key={String(label)} style={{background:'#faf6ec',border:'1.5px solid #c9b899',borderRadius:2,padding:'18px 12px',textAlign:'center',boxShadow:'0 3px 14px rgba(44,31,14,0.08)'}}>
                <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.58rem',color:'#8a7560',letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:8}}>{label}</p>
                <p style={{fontFamily:'"Cinzel",serif',fontSize:'1.8rem',fontWeight:700,color:'#4a5e3a'}}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
            <Leaf size={16} color="#4a5e3a"/>
            <h3 style={{fontFamily:'"Cinzel",serif',fontSize:'0.95rem',fontWeight:600,color:'#5c3d1e',letterSpacing:'0.1em'}}>My Listings</h3>
          </div>
          <LeafDivider color="#c9b899"/>
          {loading ? <Spinner/> : myProducts.length===0 ? (
            <div style={{padding:'50px 0',textAlign:'center'}}>
              <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',color:'#8a7560'}}>No listings yet. Start selling!</p>
            </div>
          ) : (
            <div style={{marginTop:18,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:16}}>
              {myProducts.map((p) => (
                <div key={p.id} style={{background:'#faf6ec',border:`1.5px solid ${confirmId===p.id?'#a04030':'#c9b899'}`,borderRadius:2,overflow:'hidden',boxShadow:'0 3px 14px rgba(44,31,14,0.08)',transition:'border-color .2s'}}>
                  <div className="lift" onClick={() => onProduct(p)} style={{cursor:'pointer'}}>
                    <div style={{position:'relative'}}>
                      <img src={p.imageUrl} style={{width:'100%',aspectRatio:'4/3',objectFit:'cover',filter:'sepia(8%)'}} alt=""/>
                      {deletingId===p.id && <div style={{position:'absolute',inset:0,background:'rgba(245,237,214,0.85)',display:'flex',alignItems:'center',justifyContent:'center'}}><Loader2 size={24} color="#a04030" style={{animation:'spin 1s linear infinite'}}/></div>}
                    </div>
                    <div style={{padding:'10px 12px 8px',borderTop:'1px solid #c9b899'}}>
                      <h4 style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'0.88rem',color:'#5c3d1e',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.name}</h4>
                      <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.88rem',color:'#4a5e3a',fontWeight:600,marginTop:4}}>₹{p.price}</p>
                    </div>
                  </div>
                  <div style={{padding:'0 10px 10px'}}>
                    <button className="press" onClick={(e) => handleDelete(p.id,e)} disabled={deletingId===p.id}
                      style={{width:'100%',padding:'7px 8px',background:confirmId===p.id?'#a04030':'transparent',color:confirmId===p.id?'#f5edd6':'#a04030',border:'1px solid #a04030',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.6rem',letterSpacing:'0.1em',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all .2s'}}>
                      {confirmId===p.id ? '⚠ Confirm Remove' : '✕ Remove'}
                    </button>
                    {confirmId===p.id && <button onClick={(e) => {e.stopPropagation();setConfirmId(null);}} style={{width:'100%',marginTop:4,padding:'5px',background:'transparent',border:'1px solid #c9b899',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.58rem',color:'#8a7560',cursor:'pointer'}}>Cancel</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {!isSeller && (
        <div style={{padding:'40px 0',textAlign:'center'}}>
          <Store size={48} color="#c9b899" style={{margin:'0 auto 16px',display:'block'}}/>
          <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',color:'#8a7560',fontSize:'1rem',marginBottom:8}}>You are browsing as a buyer.</p>
          <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.9rem',color:'#8a7560'}}>Click "Sell" to open your own workshop!</p>
        </div>
      )}
    </div>
  );
}

function LoginView({onLogin}:{onLogin:(u:{role:'buyer'|'seller';name:string;id:string})=>void;}) {
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [name,setName]=useState('');
  const [isReg,setIsReg]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const inp:React.CSSProperties={width:'100%',marginTop:7,padding:'11px 14px',background:'#f5edd6',border:'1.5px solid #c9b899',borderRadius:2,fontSize:'0.96rem',outline:'none',color:'#2c1f0e',fontFamily:'"Crimson Pro",serif'};
  const lbl:React.CSSProperties={fontFamily:'"Cinzel",serif',fontSize:'0.65rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.14em',color:'#8a7560'};
  const submit=async () => {
    setError(''); setLoading(true);
    try {
      const res=isReg ? await api.auth.register({name,email,password:pass,role:'buyer'}) : await api.auth.login(email,pass);
      onLogin({role:res.user.role,name:res.user.shopName??res.user.name,id:res.user.id});
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof TypeError) setError('Cannot reach server. Please wait 30 seconds and try again.');
      else setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };
  return (
    <div style={{maxWidth:400,margin:'32px auto',background:'#faf6ec',border:'2px solid #c9b899',borderRadius:2,padding:'32px 20px',boxShadow:'0 6px 28px rgba(44,31,14,0.1)',position:'relative',overflow:'hidden'}}>
      <WoodGrain/>
      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',gap:18,textAlign:'center'}}>
        <div style={{display:'flex',justifyContent:'center'}}><Leaf size={36} color="#4a5e3a"/></div>
        <div>
          <h2 style={{fontFamily:'"Cinzel",serif',fontSize:'1.5rem',fontWeight:700,color:'#5c3d1e',letterSpacing:'0.08em'}}>{isReg ? 'Join the Bazaar' : 'Welcome Back'}</h2>
          <p style={{fontFamily:'"IM Fell English",serif',fontStyle:'italic',color:'#8a7560',marginTop:6,fontSize:'0.88rem'}}>{isReg ? 'Create your account to buy & sell' : 'Sign in to continue'}</p>
          <LeafDivider color="#c9b899"/>
        </div>
        {error && (
          <div style={{padding:'10px 14px',background:'rgba(160,64,48,0.1)',border:'1px solid rgba(160,64,48,0.3)',borderRadius:2,display:'flex',alignItems:'center',gap:8}}>
            <AlertCircle size={14} color="#a04030"/>
            <span style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.88rem',color:'#a04030',textAlign:'left'}}>{error}</span>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:14,textAlign:'left'}}>
          {isReg && <div><label style={lbl}>Full Name</label><input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Your name"/></div>}
          <div><label style={lbl}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="your@email.com"/></div>
          <div><label style={lbl}>Password</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} style={inp} placeholder="••••••••" onKeyDown={(e) => {if(e.key==='Enter') void submit();}}/></div>
        </div>
        <button className="press" onClick={() => void submit()} disabled={loading}
          style={{padding:'14px',background:loading?'#8a7560':'#4a5e3a',color:'#f5edd6',border:'none',borderRadius:2,fontFamily:'"Cinzel",serif',fontSize:'0.8rem',letterSpacing:'0.14em',display:'flex',alignItems:'center',justifyContent:'center',gap:10,cursor:loading?'not-allowed':'pointer'}}>
          {loading ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Please wait…</> : <>{isReg ? 'Create Account' : 'Sign In'} <ArrowRight size={15}/></>}
        </button>
        <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.85rem',color:'#8a7560',fontStyle:'italic'}}>
          {isReg ? 'Already have an account? ' : 'New here? '}
          <button onClick={() => {setIsReg((r) => !r);setError('');}} style={{background:'none',border:'none',color:'#4a5e3a',fontStyle:'italic',cursor:'pointer',textDecoration:'underline',fontSize:'0.85rem',fontFamily:'"Crimson Pro",serif'}}>
            {isReg ? 'Sign in' : 'Create account'}
          </button>
        </p>
        <div style={{padding:'12px 16px',background:'rgba(74,94,58,0.08)',border:'1px solid rgba(74,94,58,0.2)',borderRadius:2}}>
          <p style={{fontFamily:'"Cinzel",serif',fontSize:'0.6rem',color:'#4a5e3a',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Demo Accounts</p>
          <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.82rem',color:'#8a7560'}}>buyer@demo.com / password123</p>
          <p style={{fontFamily:'"Crimson Pro",serif',fontSize:'0.82rem',color:'#8a7560'}}>u1@artisanbazaar.com / password123</p>
        </div>
      </div>
    </div>
  );
}