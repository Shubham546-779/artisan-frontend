import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Star, ChevronLeft, ChevronRight, ShoppingCart, Shield,
  Truck, RefreshCw, Package, MapPin, Clock, Award, ArrowRight,
  Trash2, Plus, Minus, Home, PlusCircle, User, Store, Leaf,
  Sprout, Loader2, AlertCircle, X, Heart, Filter, TrendingUp, Moon, Sun,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, tokenStore, ApiError } from './api/api';
import type { Product, Category, Review, ReviewsResponse, ProductDetail } from './api/api';

// ── DESIGN TOKENS ──────────────────────────────────────────
const makeTokens = (dark: boolean) => ({
  white:    dark ? '#1A1A1A' : '#FFFFFF',
  offwhite: dark ? '#141414' : '#FAFAF8',
  paper:    dark ? '#242424' : '#F5F2ED',
  paperD:   dark ? '#2E2E2E' : '#EDE8E0',
  line:     dark ? '#333333' : '#E2DDD5',
  lineD:    dark ? '#444444' : '#C8C0B4',
  ink:      dark ? '#F0EDE8' : '#1C1410',
  inkM:     dark ? '#C8BFB5' : '#4A3F35',
  inkL:     dark ? '#8A8078' : '#7A6E64',
  forest:   dark ? '#4A7A4A' : '#2D4A2D',
  forestM:  dark ? '#5A9A5A' : '#3D6B3D',
  forestL:  dark ? '#6AAA6A' : '#5A8A5A',
  forestXL: dark ? '#1E3A1E' : '#C8DCC8',
  earth:    dark ? '#8B6340' : '#6B4C2A',
  earthM:   dark ? '#A07850' : '#8B6340',
  earthL:   dark ? '#C8A07A' : '#B8956A',
  earthXL:  dark ? '#2A1E10' : '#F0E8D8',
  gold:     '#C9A84C',
  goldL:    '#E8D08A',
  rust:     dark ? '#CC5544' : '#9B3D2A',
  sage:     dark ? '#7A9F7A' : '#8FAF8F',
  shadow:   dark ? 'rgba(0,0,0,0.3)' : 'rgba(28,20,16,0.08)',
  shadowM:  dark ? 'rgba(0,0,0,0.5)' : 'rgba(28,20,16,0.14)',
  shadowL:  dark ? 'rgba(0,0,0,0.7)' : 'rgba(28,20,16,0.22)',
});

type Tokens = ReturnType<typeof makeTokens>;

const CATEGORIES: Category[] = ['Jewelry','Home Decor','Clothing','Art','Toys','Gifts','Other'];

const CAT_META: Record<string, { emoji:string; label:string; color:string; bg:string }> = {
  All:          { emoji:'🌿', label:'All',        color:'#3D6B3D', bg:'#E8F0E8' },
  Jewelry:      { emoji:'💎', label:'Jewelry',    color:'#7A5830', bg:'#F8F0E0' },
  'Home Decor': { emoji:'🪵', label:'Home',       color:'#6B3D20', bg:'#F5EDE0' },
  Clothing:     { emoji:'🌾', label:'Clothing',   color:'#3D5830', bg:'#E8F0E0' },
  Art:          { emoji:'🎨', label:'Art',        color:'#7A3020', bg:'#F5E8E0' },
  Toys:         { emoji:'🌲', label:'Toys',       color:'#2D5820', bg:'#E0F0E0' },
  Gifts:        { emoji:'🌸', label:'Gifts',      color:'#7A3050', bg:'#F5E0E8' },
  Other:        { emoji:'🍃', label:'More',       color:'#3D5840', bg:'#E0EDE8' },
};

interface CartItem { product: Product; qty: number; }
type ViewName = 'home'|'sell'|'profile'|'product'|'login'|'admin';
type NavName  = 'home'|'sell'|'profile'|'login'|'admin';

// ── UPDATED: added email + _loginEmail for re-auth ─────────
interface AppUser {
  role: 'buyer'|'seller'|null;
  name: string;
  id: string;
  email?: string;
}

// ── DEVELOPER ID ───────────────────────────────────────────
const DEV_EMAIL = 'shubhamvairagl0@gmail.com';

// ── HELPERS ────────────────────────────────────────────────
const clamp = (n:number): React.CSSProperties => ({
  display:'-webkit-box' as React.CSSProperties['display'],
  WebkitLineClamp:n,
  WebkitBoxOrient:'vertical' as unknown as React.CSSProperties['WebkitBoxOrient'],
  overflow:'hidden',
});

// ── SPINNER ────────────────────────────────────────────────
function Spinner({ label='Loading…', T }:{ label?:string; T:Tokens }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 20px', gap:16 }}>
      <div style={{ width:40, height:40, border:`3px solid ${T.forestXL}`, borderTopColor:T.forest, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ fontFamily:'"Crimson Pro",serif', fontStyle:'italic', color:T.inkL, fontSize:'1rem' }}>{label}</p>
    </div>
  );
}

// ── TOAST ──────────────────────────────────────────────────
function Toast({ msg, type, onClose }:{ msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t=setTimeout(onClose,3000); return ()=>clearTimeout(t); },[onClose]);
  return (
    <motion.div initial={{ opacity:0, y:50, x:'-50%' }} animate={{ opacity:1, y:0, x:'-50%' }} exit={{ opacity:0, y:50, x:'-50%' }}
      style={{ position:'fixed', bottom:'5.5rem', left:'50%', zIndex:9999, background:type==='error'?'#9B3D2A':'#2D4A2D',
        color:'#fff', padding:'12px 20px', borderRadius:8, fontSize:'0.82rem', fontFamily:'"Inter",sans-serif',
        boxShadow:'0 8px 32px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap',
        maxWidth:'90vw', fontWeight:500 }}>
      {type==='error' ? <AlertCircle size={15}/> : '✓'} {msg}
    </motion.div>
  );
}

// ── CART DRAWER ────────────────────────────────────────────
function CartDrawer({ cart, onClose, onUpdateQty, onRemove, onClearCart, showToast, T, onBrowseWares }:
  { cart:CartItem[]; onClose:()=>void; onUpdateQty:(id:string,qty:number)=>void;
    onRemove:(id:string)=>void; onClearCart:()=>void; showToast:(m:string,t?:'success'|'error')=>void; T:Tokens; onBrowseWares:()=>void }) {
  const total = cart.reduce((s,i) => s+i.product.price*i.qty, 0);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ orderId:'', email:'' });

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }}
        onClick={onClose}>
        <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', damping:28, stiffness:280 }}
          onClick={e=>e.stopPropagation()}
          style={{ position:'absolute', top:0, right:0, bottom:0, width:'min(440px,100vw)', background:T.white,
            display:'flex', flexDirection:'column', boxShadow:`-12px 0 48px ${T.shadowL}` }}>
          <div style={{ padding:'20px 24px', borderBottom:`1px solid ${T.line}`, display:'flex', alignItems:'center',
            justifyContent:'space-between', background:T.white, marginTop:'env(safe-area-inset-top)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ background:T.forest, borderRadius:8, padding:'8px', display:'flex' }}>
                <ShoppingCart size={18} color="#fff"/>
              </div>
              <div>
                <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.1rem', fontWeight:700, color:T.ink, margin:0 }}>Your Basket</h2>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, margin:0 }}>{cart.length} item{cart.length!==1?'s':''}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background:T.paper, border:'none', borderRadius:8, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:T.inkM }}>
              <ChevronLeft size={18}/>
            </button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
            {cart.length===0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, padding:'60px 20px' }}>
                <div style={{ width:80, height:80, background:T.paper, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ShoppingCart size={36} color={T.lineD}/>
                </div>
                <p style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.1rem', color:T.inkM, fontStyle:'italic', textAlign:'center' }}>Your basket is empty</p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.inkL, textAlign:'center' }}>Discover handcrafted wares and add them here</p>
                <button onClick={onBrowseWares} style={{ padding:'10px 24px', background:T.forest, color:'#fff', border:'none', borderRadius:8, fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>Browse Wares <ArrowRight size={14}/></button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {cart.map(item => (
                  <div key={item.product.id} style={{ background:T.offwhite, borderRadius:12, padding:'12px', display:'flex', gap:12, alignItems:'center', border:`1px solid ${T.line}` }}>
                    <img src={item.product.imageUrl} alt={item.product.name} style={{ width:72, height:72, objectFit:'cover', borderRadius:8, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'0.9rem', color:T.ink, lineHeight:1.3, ...clamp(2), margin:'0 0 2px' }}>{item.product.name}</p>
                      <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, margin:'0 0 8px' }}>{item.product.sellerName}</p>
                      <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.9rem', fontWeight:700, color:T.forest, margin:0 }}>₹{(item.product.price*item.qty).toFixed(2)}</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', background:T.paper, borderRadius:8, overflow:'hidden', border:`1px solid ${T.line}` }}>
                        <button onClick={()=>item.qty>1?onUpdateQty(item.product.id,item.qty-1):onRemove(item.product.id)}
                          style={{ width:30, height:30, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:T.inkM }}><Minus size={12}/></button>
                        <span style={{ width:28, textAlign:'center', fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, color:T.ink }}>{item.qty}</span>
                        <button onClick={()=>onUpdateQty(item.product.id,item.qty+1)}
                          style={{ width:30, height:30, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:T.inkM }}><Plus size={12}/></button>
                      </div>
                      <button onClick={()=>onRemove(item.product.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.rust, padding:4 }}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length>0 && (
            <div style={{ padding:'20px 24px', borderTop:`1px solid ${T.line}`, background:T.white }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.inkL, fontWeight:500 }}>Total Amount</span>
                <span style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.4rem', fontWeight:700, color:T.ink }}>₹{total.toFixed(2)}</span>
              </div>
              <button onClick={()=>setShowOrderForm(true)}
                style={{ width:'100%', padding:'14px', background:T.forest, color:'#fff', border:'none', borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                Proceed to Checkout <ArrowRight size={16}/>
              </button>
              <p style={{ textAlign:'center', fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, marginTop:10 }}>
                🚚 Free delivery on orders above ₹50
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showOrderForm && (
          <OrderFormModal cart={cart} onClose={()=>setShowOrderForm(false)} T={T}
            onSuccess={()=>{
              const oid=`AB-${Date.now().toString(36).toUpperCase()}`;
              setSuccessData({orderId:oid,email:''});
              setShowOrderForm(false); setShowSuccess(true); onClearCart();
            }}/>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSuccess && (
          <OrderSuccessModal orderId={successData.orderId} email={successData.email} T={T}
            onClose={()=>{ setShowSuccess(false); onClose(); }}/>
        )}
      </AnimatePresence>
    </>
  );
}

// ── ORDER FORM MODAL ───────────────────────────────────────
// ── ORDER FORM MODAL ───────────────────────────────────────
// Replace the ENTIRE OrderFormModal function in your App.tsx with this

interface OrderForm { name:string; email:string; mobile:string; address:string; city:string; pincode:string; }

function OrderFormModal({ cart, onClose, onSuccess, T }:{ cart:CartItem[]; onClose:()=>void; onSuccess:()=>void; T:Tokens }) {
  const total = cart.reduce((s,i) => s+i.product.price*i.qty, 0);
  const [form, setForm] = useState<OrderForm>({name:'',email:'',mobile:'',address:'',city:'',pincode:''});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const orderId = `AB-${Date.now().toString(36).toUpperCase()}`;

  const inp:React.CSSProperties = { width:'100%', marginTop:6, padding:'11px 14px', background:T.offwhite,
    border:`1.5px solid ${T.line}`, borderRadius:8, fontSize:'0.9rem', outline:'none', color:T.ink,
    fontFamily:'"Inter",sans-serif', transition:'border-color .2s' };
  const lbl:React.CSSProperties = { fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600,
    textTransform:'uppercase', letterSpacing:'0.08em', color:T.inkL };

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required';
    if (!form.email.trim()||!form.email.includes('@')) return 'Valid email is required';
    if (!form.mobile.trim()||form.mobile.length<10) return 'Valid mobile number is required';
    if (!form.address.trim()) return 'Address is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.pincode.trim()) return 'Pincode is required';
    return null;
  };

  const placeOrder = async () => {
    const err = validate();
    if (err) { setError(err); return; }

   const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'service_q308t9o';
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_wpt8k4w';
const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'gmhrNm1DKu9SF_J_y';

    if (!serviceId || !templateId || !publicKey) {
      setError(
        `Email service not configured. Missing:${!serviceId?' SERVICE_ID':''}${!templateId?' TEMPLATE_ID':''}${!publicKey?' PUBLIC_KEY':''}`
      );
      return;
    }

    setSending(true);
    setError('');

    try {
      const ejs = (window as any).emailjs;
      if (!ejs) {
        setError('EmailJS script not loaded. Check index.html.');
        setSending(false);
        return;
      }

      const itemsText = cart
        .map(i => `• ${i.product.name} (x${i.qty}) — Rs.${(i.product.price * i.qty).toFixed(2)}`)
        .join('\n');

      await ejs.send(
        serviceId,
        templateId,
        {
          order_id:         orderId,
          customer_name:    form.name,
          name:             form.name,       // matches {{name}} in From Name field
          to_email:         form.email,      // matches {{to_email}} in To Email field
          email:            form.email,      // matches {{email}} in Reply To field
          mobile:           form.mobile,
          order_items:      itemsText,
          order_total:      total.toFixed(2),
          delivery_address: `${form.address}, ${form.city} - ${form.pincode}`,
          order_date:       new Date().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          }),
        },
        publicKey,
      );

      onSuccess();
    } catch (e: any) {
      console.error('EmailJS error:', e);
      // Show the actual EmailJS error message if available
      const msg = e?.text || e?.message || 'Could not send confirmation. Please try again.';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, zIndex:700, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:280}}
        style={{ background:T.white, borderRadius:'16px 16px 0 0', width:'100%', maxWidth:520,
          maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:`0 -8px 40px ${T.shadowL}` }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${T.line}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.2rem', fontWeight:700, color:T.ink, margin:'0 0 4px' }}>Delivery Details</h2>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:T.inkL, margin:0 }}>Order {orderId} · ₹{total.toFixed(2)}</p>
          </div>
          <button onClick={onClose} style={{ background:T.paper, border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:T.inkM }}>
            <X size={18}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {/* Order Summary */}
          <div style={{ background:T.paper, borderRadius:12, padding:'14px', marginBottom:20 }}>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:T.inkL, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Order Summary</p>
            {cart.map(item => (
              <div key={item.product.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <img src={item.product.imageUrl} style={{ width:40, height:40, objectFit:'cover', borderRadius:6 }} alt=""/>
                  <div>
                    <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.ink, margin:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:160 }}>{item.product.name}</p>
                    <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, margin:0 }}>x{item.qty}</p>
                  </div>
                </div>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, color:T.forest, margin:0 }}>₹{(item.product.price*item.qty).toFixed(2)}</p>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${T.line}`, marginTop:10, paddingTop:10, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, color:T.inkM }}>Total</span>
              <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'1rem', fontWeight:700, color:T.ink }}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Personal Details */}
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:T.forest, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
            <User size={13}/>Personal Details
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
            <div>
              <label style={lbl}>Full Name *</label>
              <input type="text" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Email *</label>
                <input type="email" placeholder="email@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Mobile *</label>
                <input type="tel" placeholder="9876543210" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} style={inp}/>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:T.forest, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
            <MapPin size={13}/>Delivery Address
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={lbl}>Street Address *</label>
              <input type="text" placeholder="House no., Street, Area" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>City *</label>
                <input type="text" placeholder="Mumbai" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Pincode *</label>
                <input type="text" placeholder="400001" value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value})} style={inp}/>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop:14, padding:'12px 14px', background:'#FFF0EE', border:'1px solid #F5C5BE', borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
              <AlertCircle size={14} color="#9B3D2A"/>
              <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:'#9B3D2A' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer button */}
        <div style={{ padding:'20px 24px', borderTop:`1px solid ${T.line}` }}>
          <button onClick={placeOrder} disabled={sending}
            style={{ width:'100%', padding:'14px', background:sending?T.inkL:T.forest, color:'#fff', border:'none', borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.9rem', fontWeight:600, cursor:sending?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {sending
              ? <><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Sending…</>
              : <>Place Order & Get Email Confirmation <ArrowRight size={15}/></>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ── ORDER SUCCESS ──────────────────────────────────────────
function OrderSuccessModal({ orderId, email, onClose, T }:{ orderId:string; email:string; onClose:()=>void; T:Tokens }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200,damping:18}}
        style={{ background:T.white, borderRadius:20, padding:'36px 28px', maxWidth:380, width:'100%', textAlign:'center', boxShadow:`0 24px 64px ${T.shadowL}` }}>
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2,type:'spring',stiffness:260}}
          style={{ width:72, height:72, background:T.forest, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'2rem' }}>✓</motion.div>
        <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.5rem', fontWeight:700, color:T.ink, marginBottom:8 }}>Order Placed!</h2>
        <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', color:T.inkL, marginBottom:20, lineHeight:1.6 }}>Your handcrafted items are on their way 🌿</p>
        <div style={{ background:T.paper, borderRadius:10, padding:'14px', marginBottom:16 }}>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.7rem', color:T.inkL, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Order ID</p>
          <p style={{ fontFamily:'monospace', fontSize:'1rem', fontWeight:700, color:T.forest }}>{orderId}</p>
        </div>
        <div style={{ background:'#F0F8F0', border:'1px solid #C8E0C8', borderRadius:10, padding:'12px', marginBottom:24 }}>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:'#3D6B3D' }}>📧 Confirmation email sent!</p>
        </div>
        <button onClick={onClose} style={{ width:'100%', padding:'13px', background:T.forest, color:'#fff', border:'none', borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' }}>
          Continue Shopping
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── SHOP NAME MODAL ────────────────────────────────────────
function ShopNameModal({ onConfirm, onClose, T }:{ onConfirm:(s:string)=>void; onClose:()=>void; T:Tokens }) {
  const [shopName, setShopName] = useState('');
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}}
        style={{ background:T.white, borderRadius:20, padding:'32px 28px', maxWidth:380, width:'100%', boxShadow:`0 24px 64px ${T.shadowL}` }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>🏪</div>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.4rem', fontWeight:700, color:T.ink, marginBottom:8 }}>Open Your Workshop</h2>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:T.inkL, lineHeight:1.6 }}>Give your shop a name to start selling your handcrafted items</p>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.75rem', fontWeight:600, color:T.inkL, textTransform:'uppercase', letterSpacing:'0.08em' }}>Shop Name</label>
          <input type="text" placeholder="e.g. Priya's Craft Studio" value={shopName} onChange={e=>setShopName(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&shopName.trim()) onConfirm(shopName.trim()); }} autoFocus
            style={{ width:'100%', marginTop:8, padding:'12px 14px', background:T.offwhite, border:`1.5px solid ${T.line}`, borderRadius:10, fontSize:'0.95rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif' }}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={()=>shopName.trim()&&onConfirm(shopName.trim())} disabled={!shopName.trim()}
            style={{ padding:'13px', background:shopName.trim()?T.forest:T.lineD, color:'#fff', border:'none', borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, cursor:shopName.trim()?'pointer':'not-allowed' }}>
            Open Workshop 🌿
          </button>
          <button onClick={onClose} style={{ padding:'12px', background:'transparent', color:T.inkL, border:`1px solid ${T.line}`, borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', cursor:'pointer' }}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── IMAGE UPLOADER ─────────────────────────────────────────
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function ImageUploader({ value, onChange, T }:{ value:string; onChange:(url:string)=>void; T:Tokens }) {
  const [uploading, setUploading]   = useState(false);
  const [preview, setPreview]       = useState(value);
  const [error, setError]           = useState('');
  const [urlMode, setUrlMode]       = useState(false);
  const [urlInput, setUrlInput]     = useState('');
  const fileRef    = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const folderRef  = useRef<HTMLInputElement>(null);

  const reset = () => { setPreview(''); onChange(''); setUrlInput(''); setUrlMode(false); setError(''); };

  const uploadFile = async (file:File) => {
    setUploading(true); setError('');
    const reader = new FileReader();
    reader.onload = e => { const d=e.target?.result as string; setPreview(d); onChange(d); };
    reader.readAsDataURL(file);
    try {
      const fd = new FormData(); fd.append('image', file);
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY||'c2d3f5d7f9e1a3b5';
      const res  = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`,{method:'POST',body:fd});
      const data = await res.json();
      if (data.success) { setPreview(data.data.url); onChange(data.data.url); }
    } catch { /* keep local base64 preview */ }
    finally { setUploading(false); }
  };

  const applyUrl = () => {
    const u = urlInput.trim();
    if (!u) { setError('Please enter a valid URL'); return; }
    if (!/^https?:\/\//i.test(u)) { setError('URL must start with http:// or https://'); return; }
    setPreview(u); onChange(u); setUrlMode(false); setError('');
  };

  const mobile = isMobile();

  const pickBtn = (accent:string, bg:string): React.CSSProperties => ({
    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
    padding:'9px 14px', background:bg, color:accent,
    border:`1.5px solid ${accent}`, borderRadius:9,
    fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', fontWeight:600,
    cursor:'pointer', flex:1, whiteSpace:'nowrap', transition:'opacity .15s',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <input ref={fileRef}   type="file" accept="image/*"             onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadFile(f); }} style={{display:'none'}}/>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadFile(f); }} style={{display:'none'}}/>
      <input ref={folderRef} type="file" accept="image/*"             onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadFile(f); }} style={{display:'none'}}/>

      {preview ? (
        <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:`1px solid ${T.line}` }}>
          <img src={preview} alt="Preview" style={{ width:'100%', height:200, objectFit:'cover', display:'block' }}/>
          {uploading && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
              <Loader2 size={28} color="#fff" style={{animation:'spin 1s linear infinite'}}/>
              <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:'#fff', fontWeight:600 }}>Uploading…</span>
            </div>
          )}
          <button onClick={reset} style={{ position:'absolute', top:8, right:8, background:T.rust, border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
            <X size={13}/>
          </button>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 10px', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', gap:8 }}>
            {mobile ? (
              <>
                <button onClick={()=>fileRef.current?.click()}   style={pickBtn('#fff','rgba(255,255,255,0.15)')}>🖼 Gallery</button>
                <button onClick={()=>cameraRef.current?.click()} style={pickBtn('#fff','rgba(255,255,255,0.15)')}>📷 Camera</button>
              </>
            ) : (
              <>
                <button onClick={()=>folderRef.current?.click()} style={pickBtn('#fff','rgba(255,255,255,0.15)')}>📁 Folder</button>
                <button onClick={()=>fileRef.current?.click()}   style={pickBtn('#fff','rgba(255,255,255,0.15)')}>🖼 Browse</button>
              </>
            )}
            <button onClick={()=>setUrlMode(v=>!v)} style={pickBtn('#fff','rgba(255,255,255,0.15)')}>🔗 URL</button>
          </div>
        </div>
      ) : (
        <div onDragOver={e=>e.preventDefault()} onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) uploadFile(f); }}
          style={{ border:`2px dashed ${T.line}`, borderRadius:12, background:T.offwhite, overflow:'hidden' }}>
          {uploading ? (
            <div style={{ padding:'36px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <Loader2 size={32} color={T.forest} style={{animation:'spin 1s linear infinite'}}/>
              <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.forest, fontWeight:600 }}>Uploading image…</p>
            </div>
          ) : (
            <>
              <div style={{ padding:'24px 20px 16px', textAlign:'center' }}>
                <div style={{ width:52, height:52, background:T.forestXL, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.forest} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, color:T.inkM, marginBottom:4 }}>
                  {mobile ? 'Tap a button below to add photo' : 'Drag & drop or choose below'}
                </p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.7rem', color:T.inkL }}>JPG · PNG · WEBP · Max 5 MB</p>
              </div>
              <div style={{ padding:'0 14px 14px', display:'flex', gap:8, flexWrap:'wrap' }}>
                {mobile ? (
                  <>
                    <button onClick={()=>fileRef.current?.click()} style={pickBtn(T.forest, T.forestXL)}>🖼️ Gallery</button>
                    <button onClick={()=>cameraRef.current?.click()} style={pickBtn(T.earth, T.earthXL)}>📷 Camera</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>folderRef.current?.click()} style={pickBtn(T.forest, T.forestXL)}>📁 From Folder</button>
                    <button onClick={()=>fileRef.current?.click()} style={pickBtn(T.earth, T.earthXL)}>🖼️ Browse Files</button>
                  </>
                )}
                <button onClick={()=>setUrlMode(v=>!v)} style={pickBtn(T.inkM, T.paper)}>🔗 Paste URL</button>
              </div>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {urlMode && (
          <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.15}}
            style={{ background:T.paper, borderRadius:10, padding:'12px 14px', border:`1.5px solid ${T.forestL}` }}>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:T.forest, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Paste Image URL</p>
            <div style={{ display:'flex', gap:8 }}>
              <input type="url" autoFocus placeholder="https://example.com/photo.jpg" value={urlInput}
                onChange={e=>{ setUrlInput(e.target.value); setError(''); }}
                onKeyDown={e=>{ if(e.key==='Enter') applyUrl(); if(e.key==='Escape') setUrlMode(false); }}
                style={{ flex:1, padding:'9px 12px', background:T.white, border:`1.5px solid ${T.line}`, borderRadius:8, fontSize:'0.85rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif' }}/>
              <button onClick={applyUrl} style={{ padding:'9px 16px', background:T.forest, color:'#fff', border:'none', borderRadius:8, fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>Use</button>
              <button onClick={()=>{ setUrlMode(false); setError(''); }} style={{ width:36, height:36, background:T.paper, border:`1px solid ${T.line}`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:T.inkL, flexShrink:0 }}><X size={14}/></button>
            </div>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.7rem', color:T.inkL, marginTop:6 }}>Press Enter to confirm · Esc to cancel</p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'#FFF0EE', border:'1px solid #F5C5BE', borderRadius:8 }}>
          <AlertCircle size={13} color="#9B3D2A"/>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:'#9B3D2A' }}>{error}</p>
        </div>
      )}
    </div>
  );
}

// ── RE-LOGIN MODAL ─────────────────────────────────────────
// Shown after role upgrade so user can get a fresh seller token
function ReLoginModal({ email, shopName, onSuccess, onClose, T }:
  { email:string; shopName:string; onSuccess:(u:{role:'buyer'|'seller';name:string;id:string;email:string})=>void; onClose:()=>void; T:Tokens }) {
  const [pass, setPass]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    if (!pass.trim()) { setError('Please enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.auth.login(email, pass);
      onSuccess({ role: res.user.role, name: res.user.shopName ?? res.user.name, id: res.user.id, email });
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Could not sign in. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} transition={{type:'spring',stiffness:220,damping:22}}
        style={{ background:T.white, borderRadius:20, padding:'32px 28px', maxWidth:380, width:'100%', boxShadow:`0 24px 64px ${T.shadowL}` }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:'2.5rem', marginBottom:12 }}>🔑</div>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.3rem', fontWeight:700, color:T.ink, marginBottom:8 }}>One Last Step</h2>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:T.inkL, lineHeight:1.6 }}>
            Your workshop <strong style={{color:T.ink}}>"{shopName}"</strong> is ready!<br/>
            Sign in once more to activate your seller account.
          </p>
        </div>

        <div style={{ background:T.paper, borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
          <User size={14} color={T.inkL}/>
          <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.inkM }}>{email}</span>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.75rem', fontWeight:600, color:T.inkL, textTransform:'uppercase', letterSpacing:'0.08em' }}>Password</label>
          <input type="password" placeholder="••••••••" value={pass}
            onChange={e=>{ setPass(e.target.value); setError(''); }}
            onKeyDown={e=>{ if(e.key==='Enter') void submit(); }}
            autoFocus
            style={{ width:'100%', marginTop:8, padding:'12px 14px', background:T.offwhite, border:`1.5px solid ${error?T.rust:T.line}`, borderRadius:10, fontSize:'0.92rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif' }}/>
        </div>

        {error && (
          <div style={{ padding:'10px 12px', background:'#FFF0EE', border:'1px solid #F5C5BE', borderRadius:8, display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <AlertCircle size={13} color="#9B3D2A"/>
            <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:'#9B3D2A' }}>{error}</span>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={()=>void submit()} disabled={loading}
            style={{ padding:'13px', background:loading?T.inkL:T.forest, color:'#fff', border:'none', borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Signing in…</> : <>Activate Seller Account <ArrowRight size={15}/></>}
          </button>
          <button onClick={onClose} style={{ padding:'11px', background:'transparent', color:T.inkL, border:`1px solid ${T.line}`, borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', cursor:'pointer' }}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── APP ────────────────────────────────────────────────────
export function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('ab_dark')==='true'; } catch { return false; }
  });
  const T = makeTokens(darkMode);

  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedCat, setSelectedCat] = useState<Category|'All'>('All');
  const [search, setSearch]           = useState('');
  const [debSearch, setDebSearch]     = useState('');
  const [view, setView]               = useState<ViewName>('home');
  const [selProduct, setSelProduct]   = useState<Product|null>(null);
  const [prevView, setPrevView]       = useState<NavName>('home');
  const [user, setUser]               = useState<AppUser>({role:null,name:'',id:''});
  const [toast, setToast]             = useState<{msg:string;type:'success'|'error'}|null>(null);
  const [cart, setCart]               = useState<CartItem[]>(() => {
    try { const s=localStorage.getItem('ab_cart'); return s?JSON.parse(s):[]; } catch { return []; }
  });
  const [cartOpen, setCartOpen]       = useState(false);
  const [showShopModal, setShowShopModal]   = useState(false);

  // ── NEW: re-login modal state ──────────────────────────
  const [reLoginData, setReLoginData] = useState<{email:string; shopName:string}|null>(null);

  const timer = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const showToast = useCallback((msg:string, type:'success'|'error'='success') => setToast({msg,type}), []);

  useEffect(() => { try { localStorage.setItem('ab_dark', String(darkMode)); } catch {} }, [darkMode]);
  useEffect(() => { try { localStorage.setItem('ab_cart',JSON.stringify(cart)); } catch {} }, [cart]);

  useEffect(() => {
    if (tokenStore.get()) {
      api.auth.me().then(u=>setUser({role:u.role,name:u.shopName??u.name,id:u.id,email:u.email}))
        .catch(e=>{ if(e instanceof ApiError&&e.status===401) tokenStore.remove(); });
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(()=>setDebSearch(search),350);
    return ()=>clearTimeout(timer.current);
  }, [search]);

  useEffect(() => {
    if (view!=='home') return;
    setLoading(true);
    api.products.list({ category:selectedCat!=='All'?selectedCat:undefined, search:debSearch||undefined, limit:60 })
      .then(res=>setProducts(res.data))
      .catch(()=>showToast('Could not load products','error'))
      .finally(()=>setLoading(false));
  }, [selectedCat, debSearch, view, showToast]);

  const addToCart = useCallback((product:Product, qty:number=1) => {
    setCart(prev => {
      const ex=prev.find(i=>i.product.id===product.id);
      if (ex) return prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+qty}:i);
      return [...prev,{product,qty}];
    });
    showToast(`Added to basket!`);
  }, [showToast]);

  const updateCartQty  = useCallback((id:string,qty:number)=>setCart(p=>p.map(i=>i.product.id===id?{...i,qty}:i)),[]);
  const removeFromCart = useCallback((id:string)=>setCart(p=>p.filter(i=>i.product.id!==id)),[]);

  const goToProduct = useCallback((p:Product) => {
    setPrevView(view==='product'?prevView:(view as NavName));
    setSelProduct(p); setView('product');
    window.scrollTo({top:0,behavior:'smooth'});
  }, [view, prevView]);

  const nav = useCallback((v:NavName) => {
    if (v==='sell') {
      if (!user.role) { setView('login'); setSelProduct(null); return; }
      if (user.role!=='seller') { setShowShopModal(true); return; }
    }
    if (v==='profile'&&!user.role) { setView('login'); setSelProduct(null); return; }
    setView(v); setSelProduct(null);
  }, [user.role]);

  const handleLogout = useCallback(() => {
    api.auth.logout(); setUser({role:null,name:'',id:''});
    setView('home'); setSelProduct(null); showToast('Signed out');
  }, [showToast]);

  const handleLogin = useCallback((u:{role:'buyer'|'seller';name:string;id:string;email?:string}) => {
    setUser(u); setView('home'); setSelProduct(null); showToast(`Welcome, ${u.name}!`);
  }, [showToast]);

  // ── FIXED handleShopConfirm ────────────────────────────
  // After updating the role on the backend we need a FRESH JWT
  // that encodes role=seller. We show a small re-login modal
  // so the user enters their password once more and gets a new token.
  const handleShopConfirm = useCallback(async (shopName: string) => {
    setShowShopModal(false);
    try {
      await api.auth.updateProfile({ role: 'seller', shopName });
      // Wipe the old buyer token so API calls use the new one after re-login
      api.auth.logout();
      setUser({ role: null, name: '', id: '' });
      // Show the lightweight re-login modal (keeps email pre-filled)
      setReLoginData({ email: user.email ?? '', shopName });
    } catch {
      showToast('Could not open workshop', 'error');
    }
  }, [user.email, showToast]);

  // Called when re-login modal succeeds — user now has a seller JWT
  const handleReLoginSuccess = useCallback((u:{role:'buyer'|'seller';name:string;id:string;email:string}) => {
    setReLoginData(null);
    setUser(u);
    setView('sell');
    showToast(`Workshop opened! Welcome, ${u.name} 🌿`);
  }, [showToast]);

  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const isDev = user.email === DEV_EMAIL || user.name?.toLowerCase().includes('shubham');

  const bambooBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='200'%3E%3Crect width='120' height='200' fill='none'/%3E%3Crect x='18' y='0' width='10' height='200' rx='5' fill='%2348724A' opacity='0.13'/%3E%3Crect x='20' y='30' width='6' height='3' rx='1' fill='%2348724A' opacity='0.18'/%3E%3Crect x='20' y='70' width='6' height='3' rx='1' fill='%2348724A' opacity='0.18'/%3E%3Crect x='20' y='110' width='6' height='3' rx='1' fill='%2348724A' opacity='0.18'/%3E%3Crect x='20' y='150' width='6' height='3' rx='1' fill='%2348724A' opacity='0.18'/%3E%3Crect x='20' y='190' width='6' height='3' rx='1' fill='%2348724A' opacity='0.18'/%3E%3Cellipse cx='14' cy='52' rx='18' ry='4' fill='%2348724A' opacity='0.10' transform='rotate(-30 14 52)'/%3E%3Cellipse cx='32' cy='92' rx='16' ry='3.5' fill='%2348724A' opacity='0.09' transform='rotate(25 32 92)'/%3E%3Crect x='72' y='0' width='9' height='200' rx='4.5' fill='%2348724A' opacity='0.10'/%3E%3Crect x='74' y='50' width='5' height='3' rx='1' fill='%2348724A' opacity='0.15'/%3E%3Crect x='74' y='90' width='5' height='3' rx='1' fill='%2348724A' opacity='0.15'/%3E%3Crect x='74' y='130' width='5' height='3' rx='1' fill='%2348724A' opacity='0.15'/%3E%3Crect x='74' y='170' width='5' height='3' rx='1' fill='%2348724A' opacity='0.15'/%3E%3Cellipse cx='66' cy='72' rx='17' ry='3.5' fill='%2348724A' opacity='0.09' transform='rotate(28 66 72)'/%3E%3Cellipse cx='84' cy='112' rx='15' ry='3' fill='%2348724A' opacity='0.08' transform='rotate(-22 84 112)'/%3E%3Crect x='106' y='0' width='6' height='200' rx='3' fill='%2348724A' opacity='0.07'/%3E%3Crect x='107' y='60' width='4' height='2' rx='1' fill='%2348724A' opacity='0.10'/%3E%3Crect x='107' y='120' width='4' height='2' rx='1' fill='%2348724A' opacity='0.10'/%3E%3C/svg%3E")`;

  return (
    <div style={{ minHeight:'100vh', background:T.offwhite, color:T.ink, fontFamily:'"Inter",sans-serif', paddingBottom:'5rem', position:'relative' }}>
      <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:bambooBg, backgroundSize:'120px 200px', backgroundRepeat:'repeat', opacity: darkMode ? 0.6 : 1, pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;}
        .card-hover{transition:transform .2s,box-shadow .2s;} .card-hover:hover{transform:translateY(-4px);}
        .btn-primary{transition:background .15s,transform .1s;} .btn-primary:active{transform:scale(.98);}
        img{display:block;} input,select,textarea{font-family:'"Inter",sans-serif';}
        .mobile-search{display:none;}
        @media(max-width:640px){.mobile-search{display:block;} .desktop-search{display:none!important;} .hide-mobile{display:none!important;}}
        @media(max-width:480px){.product-split{grid-template-columns:1fr!important;} .product-split-img{position:static!important;border-right:none!important;border-bottom:1px solid ${T.line};} .sell-grid{grid-template-columns:1fr!important;} .stats-grid{grid-template-columns:repeat(2,1fr)!important;}}
        :root{--sat:env(safe-area-inset-top);--sab:env(safe-area-inset-bottom);}
      `}</style>

      <AnimatePresence>{toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}</AnimatePresence>
      <AnimatePresence>{cartOpen&&<CartDrawer cart={cart} onClose={()=>setCartOpen(false)} onUpdateQty={updateCartQty} onRemove={removeFromCart} onClearCart={()=>setCart([])} showToast={showToast} T={T} onBrowseWares={()=>{ setCartOpen(false); setView('home'); setSelProduct(null); }}/>}</AnimatePresence>
      <AnimatePresence>{showShopModal&&<ShopNameModal onConfirm={handleShopConfirm} onClose={()=>setShowShopModal(false)} T={T}/>}</AnimatePresence>

      {/* ── RE-LOGIN MODAL (shown after role upgrade) ── */}
      <AnimatePresence>
        {reLoginData && (
          <ReLoginModal
            email={reLoginData.email}
            shopName={reLoginData.shopName}
            onSuccess={handleReLoginSuccess}
            onClose={()=>{ setReLoginData(null); showToast('Workshop setup cancelled'); }}
            T={T}
          />
        )}
      </AnimatePresence>

      <div style={{ background:T.forest, height:'env(safe-area-inset-top)', position:'fixed', top:0, left:0, right:0, zIndex:101 }}/>

      {/* HEADER */}
      <header style={{ position:'sticky', top:'env(safe-area-inset-top)', zIndex:100, background: darkMode ? 'rgba(26,26,26,0.97)' : 'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${T.line}`, boxShadow:`0 1px 12px ${T.shadow}` }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 16px', height:60, display:'flex', alignItems:'center', gap:12 }}>
          {view==='product' && (
            <button onClick={()=>{ setView(prevView); setSelProduct(null); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:T.paper, border:'none', borderRadius:8, color:T.inkM, fontFamily:'"Inter",sans-serif', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
              <ChevronLeft size={15}/> Back
            </button>
          )}
          <div onClick={()=>nav('home')} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:10, flexShrink:0, userSelect:'none' }}>
            <div style={{ width:34, height:34, background:T.forest, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Leaf size={18} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.1rem', fontWeight:700, color:T.ink, lineHeight:1, letterSpacing:'-0.02em' }}>Artisan Bazaar</h1>
              <p className="hide-mobile" style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.62rem', color:T.inkL, lineHeight:1, marginTop:2, letterSpacing:'0.04em' }}>Handcrafted Marketplace</p>
            </div>
          </div>
          {view!=='product'&&view!=='login' && (
            <div className="desktop-search" style={{ position:'relative', flex:1, maxWidth:480 }}>
              <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:T.inkL }} size={15}/>
              <input type="text" placeholder="Search handcrafted items…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ width:'100%', paddingLeft:38, paddingRight:16, paddingTop:9, paddingBottom:9, background:T.paper, border:`1.5px solid ${T.line}`, borderRadius:10, fontSize:'0.88rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif' }}/>
            </div>
          )}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={()=>setDarkMode(d=>!d)}
              style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.line}`, background:T.paper, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:T.inkM, flexShrink:0 }}>
              {darkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            {user.role ? (
              <div onClick={()=>nav('profile')} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:T.paper, borderRadius:10, border:`1px solid ${T.line}`, cursor:'pointer' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:T.forest, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'0.78rem', fontWeight:700, flexShrink:0 }}>{user.name[0]?.toUpperCase()}</div>
                <div className="hide-mobile">
                  <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:T.ink, lineHeight:1 }}>{user.name}</p>
                  <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.62rem', color:T.inkL, lineHeight:1, marginTop:2, textTransform:'capitalize' }}>{user.role}</p>
                </div>
              </div>
            ) : (
              <button onClick={()=>nav('login')} style={{ padding:'8px 16px', background:T.forest, color:'#fff', border:'none', borderRadius:8, fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>Sign In</button>
            )}
          </div>
        </div>
        {view!=='product'&&view!=='login' && (
          <div className="mobile-search" style={{ padding:'8px 16px 10px', borderTop:`1px solid ${T.line}` }}>
            <div style={{ position:'relative' }}>
              <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:T.inkL }} size={14}/>
              <input type="text" placeholder="Search handcrafted items…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ width:'100%', paddingLeft:36, paddingRight:12, paddingTop:9, paddingBottom:9, background:T.paper, border:`1.5px solid ${T.line}`, borderRadius:10, fontSize:'0.88rem', outline:'none', color:T.ink }}/>
            </div>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main>
        <AnimatePresence mode="wait">
          {view==='home' && (
            <motion.div key="home" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>
              <HomeView products={products} loading={loading} selectedCat={selectedCat} setSelectedCat={setSelectedCat}
                onProduct={goToProduct} onAddToCart={addToCart} T={T}/>
            </motion.div>
          )}
          {view==='sell' && (
            <motion.div key="sell" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <div style={{ padding:'32px 16px', maxWidth:640, margin:'0 auto' }}>
                <SellView T={T} onAdd={async p => {
                  try { await api.products.create(p); showToast('Your craft is now listed! ✦'); setView('home'); }
                  catch(e) { showToast(e instanceof ApiError?e.message:'Failed to list','error'); }
                }}/>
              </div>
            </motion.div>
          )}
          {view==='profile' && (
            <motion.div key="profile" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <div style={{ padding:'32px 16px' }}>
                <ProfileView user={user} onProduct={goToProduct} onLogout={handleLogout} T={T}/>
              </div>
            </motion.div>
          )}
          {view==='login' && (
            <motion.div key="login" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <LoginView onLogin={handleLogin} T={T}/>
            </motion.div>
          )}
          {view==='product'&&selProduct && (
            <motion.div key={`pd-${selProduct.id}`} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <ProductDetailView product={selProduct} onProduct={goToProduct} isOwn={selProduct.sellerId===user.id} onAddToCart={addToCart} showToast={showToast} T={T}/>
            </motion.div>
          )}
          {view==='admin' && (
            <motion.div key="admin" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}>
              <div style={{ padding:'24px 16px' }}>
                <AdminView T={T} showToast={showToast}/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM NAV */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background: darkMode ? 'rgba(26,26,26,0.97)' : 'rgba(255,255,255,0.97)', backdropFilter:'blur(12px)', borderTop:`1px solid ${T.line}`, zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
        <div style={{ display:'flex', justifyContent:'space-around', maxWidth:480, margin:'0 auto', padding:'6px 0' }}>
          {([
            {v:'home' as NavName, icon:<Home size={21}/>, label:'Home'},
            {v:'sell' as NavName, icon:<PlusCircle size={21}/>, label:'Sell'},
            {v:'cart' as NavName, icon:<ShoppingCart size={21}/>, label:'Cart'},
            {v:'profile' as NavName, icon:<User size={21}/>, label:'Me'},
            ...(isDev ? [{v:'admin' as NavName, icon:<Shield size={21}/>, label:'Dev'}] : []),
          ]).map(({v,icon,label}) => {
            const active = view===v||(view==='product'&&v==='home')||(showShopModal&&v==='sell');
            return (
              <button key={v} onClick={()=>v==='cart'?setCartOpen(true):nav(v)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 16px', background:'none', border:'none', color:active?(v==='admin'?'#7A3D9A':T.forest):T.inkL, cursor:'pointer', position:'relative', transition:'color .15s' }}>
                <div style={{ padding:'4px 10px', borderRadius:10, background:active?(v==='admin'?'#EDE0F5':T.forestXL):'transparent', transition:'background .15s' }}>
                  {React.cloneElement(icon as React.ReactElement<{strokeWidth:number}>, {strokeWidth:active?2.5:1.8})}
                </div>
                <span style={{ fontSize:'0.62rem', fontFamily:'"Inter",sans-serif', fontWeight:active?700:400, letterSpacing:'0.02em' }}>{label}</span>
                {v==='cart'&&cartCount>0 && <span style={{ position:'absolute', top:2, right:6, background:T.rust, color:'#fff', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:700 }}>{cartCount}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      </div>
    </div>
  );
}

// ── HOME VIEW ──────────────────────────────────────────────
function HomeView({ products, loading, selectedCat, setSelectedCat, onProduct, onAddToCart, T }:
  { products:Product[]; loading:boolean; selectedCat:Category|'All'; setSelectedCat:(c:Category|'All')=>void;
    onProduct:(p:Product)=>void; onAddToCart:(p:Product,qty?:number)=>void; T:Tokens }) {
  return (
    <div>
      <div style={{ background:`linear-gradient(135deg, ${T.forest} 0%, #1a3320 100%)`, padding:'40px 20px 36px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.1)', borderRadius:100, padding:'6px 16px', marginBottom:20 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#C9A84C', display:'block' }}/>
            <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.75rem', color:'rgba(255,255,255,0.8)', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:500 }}>Handcrafted with love</span>
          </div>
          <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(2rem,6vw,3.5rem)', fontWeight:900, color:'#fff', lineHeight:1.1, letterSpacing:'-0.02em', marginBottom:16 }}>
            Artisan Bazaar
          </h1>
          <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'clamp(1rem,2.5vw,1.2rem)', color:'rgba(255,255,255,0.7)', lineHeight:1.7, maxWidth:480, margin:'0 auto 28px', fontStyle:'italic' }}>
            A curated marketplace of authentic handcrafted goods, made with care by skilled artisans across India.
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', marginBottom:24 }}>
            {[[`${products.length > 0 ? products.length : '70'}+`,'Products'],['500+','Artisans']].map(([v,l]) => (
              <div key={l} style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 20px', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.12)' }}>
                <p style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.3rem', fontWeight:700, color:'#fff', lineHeight:1, marginBottom:3 }}>{v}</p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:'rgba(255,255,255,0.6)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:T.white, borderBottom:`1px solid ${T.line}`, padding:'12px 16px', overflowX:'auto', position:'sticky', top:60, zIndex:50 }} className="scrollbar-hide">
        <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
          {(['All',...CATEGORIES] as (Category|'All')[]).map(cat => {
            const m = CAT_META[cat]; const active = selectedCat===cat;
            return (
              <button key={cat} onClick={()=>setSelectedCat(cat)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:100, border:`1.5px solid ${active?m.color:T.line}`, background:active?m.bg:T.paper, color:active?m.color:T.inkL, fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', fontWeight:active?600:400, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}>
                <span style={{ fontSize:'0.9rem' }}>{m.emoji}</span> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 16px 40px' }}>
        {selectedCat!=='All' && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px', background:T.white, borderRadius:16, border:`1px solid ${T.line}`, boxShadow:`0 2px 8px ${T.shadow}` }}>
              <span style={{ fontSize:'2rem' }}>{CAT_META[selectedCat].emoji}</span>
              <div>
                <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.3rem', fontWeight:700, color:T.ink, marginBottom:4 }}>{CAT_META[selectedCat].label}</h2>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:T.inkL }}>{products.length} items available</p>
              </div>
            </div>
          </motion.div>
        )}
        {loading ? <Spinner label="Discovering handcrafted wares…" T={T}/> : products.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>🌿</div>
            <p style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.2rem', color:T.inkM, fontStyle:'italic' }}>No items found</p>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:T.inkL, marginTop:8 }}>Try a different category or search term</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }} className="products-grid">
            <style>{`@media(min-width:600px){.products-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))!important;gap:20px!important;}}`}</style>
            {products.map((p,i) => (
              <motion.div key={p.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.04,.6)}}
                className="card-hover" onClick={()=>onProduct(p)}
                style={{ background:T.white, borderRadius:14, overflow:'hidden', cursor:'pointer', boxShadow:`0 2px 10px ${T.shadow}`, border:`1px solid ${T.line}` }}>
                <div style={{ aspectRatio:'1', overflow:'hidden', position:'relative', background:T.paper }}>
                  <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLImageElement).style.transform='scale(1.06)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLImageElement).style.transform='scale(1)'}/>
                  <div style={{ position:'absolute', top:8, left:8, background:'rgba(255,255,255,0.9)', borderRadius:100, padding:'2px 8px', backdropFilter:'blur(4px)' }}>
                    <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.58rem', fontWeight:600, color:T.inkM, letterSpacing:'0.06em' }}>{p.category}</p>
                  </div>
                </div>
                <div style={{ padding:'10px 12px' }}>
                  <h3 style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'0.88rem', fontWeight:600, color:T.ink, marginBottom:3, lineHeight:1.3, ...clamp(2) }}>{p.name}</h3>
                  <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.inkL, marginBottom:8 }}>by {p.sellerName}</p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:'"Playfair Display",serif', fontSize:'1rem', fontWeight:700, color:T.ink }}>₹{p.price}</span>
                    <button onClick={e=>{ e.stopPropagation(); onAddToCart(p); }}
                      style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', background:T.forest, color:'#fff', border:'none', borderRadius:7, fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', fontWeight:600, cursor:'pointer' }}>
                      <ShoppingCart size={11}/> Add
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PRODUCT DETAIL ─────────────────────────────────────────
function ProductDetailView({ product:init, onProduct, isOwn, onAddToCart, showToast, T }:
  { product:Product; onProduct:(p:Product)=>void; isOwn:boolean; onAddToCart:(p:Product,qty:number)=>void; showToast:(m:string,t?:'success'|'error')=>void; T:Tokens }) {
  const [product, setProduct] = useState<Product>(init);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<string|null>(null);
  const [qty, setQty] = useState(1);
  const [cartDone, setCartDone] = useState(false);

  useEffect(() => {
    Promise.all([api.products.get(product.id) as Promise<ProductDetail>, api.reviews.forProduct(product.id) as Promise<ReviewsResponse>])
      .then(([d,r]) => { setProduct(d); setRelated(d.related??[]); setReviews(r.data); setAvgRating(r.avgRating); })
      .catch(()=>{});
  }, [product.id]);

  const rating = parseFloat(avgRating??product.rating?.toString()??'4.5');

  return (
    <div style={{ background:T.offwhite }}>
      <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', color:T.inkL, fontFamily:'"Inter",sans-serif', overflowX:'auto', background:T.white, borderBottom:`1px solid ${T.line}` }} className="scrollbar-hide">
        <span style={{ color:T.forest, cursor:'pointer', whiteSpace:'nowrap' }}>Home</span>
        <ChevronRight size={12}/>
        <span style={{ color:T.forest, cursor:'pointer', whiteSpace:'nowrap' }}>{product.category}</span>
        <ChevronRight size={12}/>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{product.name}</span>
      </div>

      <div className="product-split" style={{ display:'grid', gridTemplateColumns:'50% 50%', minHeight:'70vh', maxWidth:1100, margin:'0 auto' }}>
        <div className="product-split-img" style={{ padding:'24px', position:'sticky', top:70, alignSelf:'start', borderRight:`1px solid ${T.line}` }}>
          <div style={{ borderRadius:16, overflow:'hidden', boxShadow:`0 8px 32px ${T.shadowM}` }}>
            <img src={product.imageUrl} alt={product.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}/>
          </div>
        </div>

        <div style={{ padding:'28px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:CAT_META[product.category]?.bg??T.paper, borderRadius:100, padding:'5px 14px', width:'fit-content' }}>
            <span style={{ fontSize:'0.85rem' }}>{CAT_META[product.category]?.emoji}</span>
            <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:CAT_META[product.category]?.color??T.inkM, letterSpacing:'0.06em' }}>{product.category}</span>
          </div>
          <div>
            <h1 style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:700, color:T.ink, lineHeight:1.2, marginBottom:12 }}>{product.name}</h1>
            {reviews.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ display:'flex', gap:2 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s<=Math.round(rating)?'#C9A84C':'none'} color={s<=Math.round(rating)?'#C9A84C':T.lineD}/>)}
                </div>
                <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, color:T.inkM }}>{rating.toFixed(1)}</span>
                <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:T.inkL }}>({reviews.length} reviews)</span>
              </div>
            )}
          </div>

          <div style={{ background:T.paper, borderRadius:14, padding:'18px 20px', display:'flex', alignItems:'center', gap:20 }}>
            <div>
              <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, marginBottom:4, fontWeight:500 }}>PRICE</p>
              <p style={{ fontFamily:'"Playfair Display",serif', fontSize:'2rem', fontWeight:700, color:T.ink, lineHeight:1 }}>₹{product.price}</p>
            </div>
            <div style={{ height:48, width:1, background:T.line }}/>
            <div style={{ marginLeft:'auto', fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:'#2D7A2D', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#2D7A2D', display:'block' }}/>
              In Stock
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:T.white, borderRadius:14, border:`1px solid ${T.line}` }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:T.forest, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'"Playfair Display",serif', fontSize:'1.1rem', fontWeight:700, flexShrink:0 }}>{product.sellerName[0]}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.7rem', color:T.inkL, marginBottom:3, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>Craftsperson</p>
              <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'1rem', color:T.ink }}>{product.sellerName}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, background:T.forestXL, borderRadius:8, padding:'5px 10px' }}>
              <Award size={12} color={T.forest}/><span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.forest, fontWeight:600 }}>Verified</span>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'14px 16px', background:T.offwhite, borderRadius:14, border:`1px solid ${T.line}` }}>
            {([[<Truck size={14}/>, 'Free delivery on orders above ₹50'],[<Clock size={14}/>, 'Ships in 3–5 business days'],[<Shield size={14}/>, '7-day easy returns']] as [React.ReactNode,string][]).map(([icon,text],i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:T.forest, flexShrink:0 }}>{icon}</span>
                <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.inkM }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', fontWeight:600, color:T.inkL, textTransform:'uppercase', letterSpacing:'0.08em' }}>Quantity</p>
            <div style={{ display:'flex', alignItems:'center', background:T.paper, borderRadius:10, border:`1px solid ${T.line}`, overflow:'hidden' }}>
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:38, height:38, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:T.inkM }}><Minus size={14}/></button>
              <span style={{ width:44, textAlign:'center', fontFamily:'"Inter",sans-serif', fontSize:'0.95rem', fontWeight:700, color:T.ink, borderLeft:`1px solid ${T.line}`, borderRight:`1px solid ${T.line}`, lineHeight:'38px' }}>{qty}</span>
              <button onClick={()=>setQty(q=>q+1)} style={{ width:38, height:38, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:T.inkM }}><Plus size={14}/></button>
            </div>
          </div>

          {!isOwn ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={()=>{ setCartDone(true); setTimeout(()=>setCartDone(false),2000); onAddToCart(product,qty); }}
                style={{ padding:'13px', background:cartDone?'#2D7A2D':T.forest, color:'#fff', border:'none', borderRadius:12, fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .2s' }}>
                <ShoppingCart size={16}/> {cartDone?'✓ Added to Basket':'Add to Basket'}
              </button>
              <button onClick={()=>{ onAddToCart(product,qty); showToast('Added to basket!'); }}
                style={{ padding:'13px', background:T.white, color:T.forest, border:`2px solid ${T.forest}`, borderRadius:12, fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' }}>
                Buy Now · ₹{(product.price*qty).toFixed(2)}
              </button>
            </div>
          ) : (
            <div style={{ padding:'14px', background:T.forestXL, borderRadius:12, textAlign:'center', fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', color:T.forest, fontWeight:600 }}>✦ This is your listing</div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[{icon:<Shield size={18}/>,t:'Secure',d:'SSL checkout'},{icon:<RefreshCw size={18}/>,t:'Returns',d:'7 days'},{icon:<Package size={18}/>,t:'Gift Wrap',d:'Free'}].map(({icon,t,d}) => (
              <div key={t} style={{ background:T.paper, borderRadius:12, padding:'12px 8px', textAlign:'center', border:`1px solid ${T.line}` }}>
                <div style={{ color:T.forest, display:'flex', justifyContent:'center', marginBottom:6 }}>{icon}</div>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', fontWeight:600, color:T.inkM }}>{t}</p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.64rem', color:T.inkL, marginTop:2 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'32px 24px', borderTop:`1px solid ${T.line}`, background:T.white }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.2rem', fontWeight:700, color:T.ink, marginBottom:16 }}>About This Piece</h2>
          <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'1.05rem', lineHeight:1.9, color:T.inkM }}>{product.description}</p>
          <div style={{ marginTop:24, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
            {[['Material','Natural'],['Craft','Handmade'],['Origin','India'],['Condition','New']].map(([k,v]) => (
              <div key={k} style={{ padding:'12px 14px', background:T.paper, borderRadius:10, border:`1px solid ${T.line}` }}>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.inkL, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{k}</p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:600, color:T.ink }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {reviews.length>0 && (
        <div style={{ padding:'32px 24px', borderTop:`1px solid ${T.line}` }}>
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
              <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.2rem', fontWeight:700, color:T.ink }}>Customer Reviews</h2>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:T.paper, borderRadius:100, padding:'4px 12px' }}>
                <Star size={13} fill='#C9A84C' color='#C9A84C'/>
                <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', fontWeight:700, color:T.ink }}>{avgRating??'4.5'}</span>
                <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL }}>({reviews.length})</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ padding:'18px 20px', background:T.white, borderRadius:14, border:`1px solid ${T.line}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:T.forest, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'"Inter",sans-serif', fontSize:'0.8rem', fontWeight:700 }}>{r.buyerName[0]}</div>
                    <div>
                      <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, color:T.ink, marginBottom:3 }}>{r.buyerName}</p>
                      <div style={{ display:'flex', gap:2 }}>{[1,2,3,4,5].map(s=><Star key={s} size={11} fill={s<=r.rating?'#C9A84C':'none'} color={s<=r.rating?'#C9A84C':T.lineD}/>)}</div>
                    </div>
                    <span style={{ marginLeft:'auto', fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL }}>{new Date(r.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'})}</span>
                  </div>
                  {r.comment && <p style={{ fontFamily:'"Crimson Pro",serif', fontSize:'0.95rem', color:T.inkM, lineHeight:1.7, fontStyle:'italic' }}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {related.length>0 && (
        <div style={{ padding:'32px 24px 48px', borderTop:`1px solid ${T.line}`, background:T.offwhite }}>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.2rem', fontWeight:700, color:T.ink, marginBottom:20 }}>More from {product.category}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>
            {related.map(p => (
              <div key={p.id} className="card-hover" onClick={()=>onProduct(p)} style={{ background:T.white, borderRadius:14, overflow:'hidden', cursor:'pointer', boxShadow:`0 2px 10px ${T.shadow}`, border:`1px solid ${T.line}` }}>
                <div style={{ aspectRatio:'4/3', overflow:'hidden' }}>
                  <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .35s' }}/>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  <h3 style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'0.88rem', color:T.ink, marginBottom:6, ...clamp(2) }}>{p.name}</h3>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:'"Playfair Display",serif', fontSize:'1rem', fontWeight:700, color:T.ink }}>₹{p.price}</span>
                    <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL }}>{p.sellerName}</span>
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

// ── SELL VIEW ──────────────────────────────────────────────
function SellView({ onAdd, T }:{ onAdd:(p:Partial<Product>)=>Promise<void>; T:Tokens }) {
  const [f, setF] = useState({ name:'', description:'', price:'', category:'Other' as Category, imageUrl:'' });
  const [submitting, setSubmitting] = useState(false);
  const inp:React.CSSProperties = { width:'100%', marginTop:6, padding:'11px 14px', background:T.offwhite, border:`1.5px solid ${T.line}`, borderRadius:10, fontSize:'0.9rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif', transition:'border-color .2s' };
  const lbl:React.CSSProperties = { fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:T.inkL };

  const handle = async () => {
    if (!f.name||!f.price||!f.imageUrl) return;
    setSubmitting(true);
    try { await onAdd({...f,price:Number(f.price)}); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ width:56, height:56, background:T.forest, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}><Leaf size={28} color="#fff"/></div>
        <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.8rem', fontWeight:700, color:T.ink, marginBottom:8 }}>List Your Craft</h2>
        <p style={{ fontFamily:'"Crimson Pro",serif', fontStyle:'italic', color:T.inkL, fontSize:'1rem' }}>Share your handmade wares with the world</p>
      </div>
      <div style={{ background:T.white, borderRadius:20, padding:'28px', boxShadow:`0 4px 24px ${T.shadow}`, border:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div><label style={lbl}>Item Name *</label><input type="text" placeholder="e.g. Hand-carved Wooden Bowl" value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp}/></div>
          <div>
            <label style={lbl}>Product Photo *</label>
            <div style={{ marginTop:8 }}><ImageUploader value={f.imageUrl} onChange={url=>setF({...f,imageUrl:url})} T={T}/></div>
          </div>
          <div className="sell-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div><label style={lbl}>Price (₹) *</label><input type="number" placeholder="0.00" value={f.price} onChange={e=>setF({...f,price:e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Category</label>
              <select value={f.category} onChange={e=>setF({...f,category:e.target.value as Category})} style={inp}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>Description</label><textarea rows={4} placeholder="Tell buyers about your craft, materials used, size, etc." value={f.description} onChange={e=>setF({...f,description:e.target.value})} style={{...inp,resize:'vertical'}}/></div>
          <button onClick={handle} disabled={submitting||!f.imageUrl||!f.name||!f.price}
            style={{ padding:'14px', background:(submitting||!f.imageUrl||!f.name||!f.price)?T.lineD:T.forest, color:'#fff', border:'none', borderRadius:12, fontFamily:'"Inter",sans-serif', fontSize:'0.9rem', fontWeight:600, cursor:(submitting||!f.imageUrl||!f.name||!f.price)?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {submitting?<><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Publishing…</>:<>Publish Listing <ArrowRight size={16}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE VIEW ───────────────────────────────────────────
function ProfileView({ user, onProduct, onLogout, T }:{ user:AppUser; onProduct:(p:Product)=>void; onLogout:()=>void; T:Tokens }) {
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [confirmId, setConfirmId]   = useState<string|null>(null);
  const isSeller = user.role==='seller';

  useEffect(() => {
    setLoading(true);
    if (isSeller&&user.id) api.products.bySeller(user.id).then(r=>setMyProducts(r.data)).catch(()=>{}).finally(()=>setLoading(false));
    else setLoading(false);
  }, [user.id,isSeller]);

  const handleDelete = async (pid:string, e:React.MouseEvent) => {
    e.stopPropagation();
    if (confirmId!==pid) { setConfirmId(pid); return; }
    setDeletingId(pid); setConfirmId(null);
    try { await api.products.delete(pid); setMyProducts(p=>p.filter(x=>x.id!==pid)); }
    catch {} finally { setDeletingId(null); }
  };

  return (
    <div style={{ maxWidth:960, margin:'0 auto' }}>
      <div style={{ background:T.white, borderRadius:20, padding:'28px', marginBottom:28, boxShadow:`0 4px 24px ${T.shadow}`, border:`1px solid ${T.line}`, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:T.forest, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <User size={36} color="#fff"/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.5rem', fontWeight:700, color:T.ink, marginBottom:4 }}>{user.name}</h2>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:T.inkL, marginBottom:4, textTransform:'capitalize' }}>{user.role} Account</p>
          <p style={{ fontFamily:'monospace', fontSize:'0.7rem', color:T.inkL, background:T.paper, padding:'2px 8px', borderRadius:6, display:'inline-block' }}>ID: {user.id}</p>
        </div>
        <button onClick={onLogout} style={{ padding:'10px 20px', background:T.paper, color:T.inkM, border:`1px solid ${T.line}`, borderRadius:10, fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', flexShrink:0 }}>Sign Out</button>
      </div>

      {isSeller && (
        <>
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:28 }}>
            {[['Items Listed',myProducts.length,'📦'],['My Shop',user.name,'🏪']].map(([l,v,e]) => (
              <div key={String(l)} style={{ background:T.white, borderRadius:16, padding:'20px 16px', textAlign:'center', boxShadow:`0 2px 10px ${T.shadow}`, border:`1px solid ${T.line}` }}>
                <p style={{ fontSize:'1.5rem', marginBottom:8 }}>{e}</p>
                <p style={{ fontFamily:'"Playfair Display",serif', fontSize:typeof v==='number'?'1.8rem':'1.1rem', fontWeight:700, color:T.forest, marginBottom:4 }}>{v}</p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.7rem', color:T.inkL, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h3 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.2rem', fontWeight:700, color:T.ink }}>My Listings</h3>
            <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:T.inkL }}>{myProducts.length} items</span>
          </div>
          {loading ? <Spinner T={T}/> : myProducts.length===0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', background:T.white, borderRadius:20, border:`1px solid ${T.line}` }}>
              <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', color:T.inkM, fontSize:'1.1rem' }}>No listings yet</p>
              <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:T.inkL, marginTop:8 }}>Start listing your handcrafted items!</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>
              {myProducts.map(p => (
                <div key={p.id} style={{ background:T.white, borderRadius:16, overflow:'hidden', boxShadow:`0 2px 10px ${T.shadow}`, border:`1.5px solid ${confirmId===p.id?T.rust:T.line}`, transition:'border-color .2s' }}>
                  <div className="card-hover" onClick={()=>onProduct(p)} style={{ cursor:'pointer' }}>
                    <div style={{ position:'relative' }}>
                      <img src={p.imageUrl} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover' }} alt=""/>
                      {deletingId===p.id && <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.85)', display:'flex', alignItems:'center', justifyContent:'center' }}><Loader2 size={24} color={T.rust} style={{animation:'spin 1s linear infinite'}}/></div>}
                    </div>
                    <div style={{ padding:'12px 14px 8px' }}>
                      <h4 style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'0.88rem', color:T.ink, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginBottom:4 }}>{p.name}</h4>
                      <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', fontWeight:700, color:T.forest }}>₹{p.price}</p>
                    </div>
                  </div>
                  <div style={{ padding:'0 12px 12px' }}>
                    <button onClick={e=>handleDelete(p.id,e)} disabled={!!deletingId}
                      style={{ width:'100%', padding:'7px', background:confirmId===p.id?T.rust:'transparent', color:confirmId===p.id?'#fff':T.rust, border:`1px solid ${T.rust}`, borderRadius:8, fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                      {confirmId===p.id?'⚠ Confirm Remove':'Remove'}
                    </button>
                    {confirmId===p.id && <button onClick={e=>{e.stopPropagation();setConfirmId(null);}} style={{ width:'100%', marginTop:4, padding:'6px', background:'transparent', border:`1px solid ${T.line}`, borderRadius:8, fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.inkL, cursor:'pointer' }}>Cancel</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!isSeller && (
        <div style={{ textAlign:'center', padding:'60px 20px', background:T.white, borderRadius:20, border:`1px solid ${T.line}` }}>
          <Store size={48} color={T.lineD} style={{ margin:'0 auto 16px', display:'block' }}/>
          <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', color:T.inkM, fontSize:'1.1rem', marginBottom:8 }}>You're browsing as a buyer</p>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:T.inkL }}>Tap "Sell" to open your own workshop!</p>
        </div>
      )}
    </div>
  );
}

// ── LOGIN VIEW ─────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { label:'Guest Buyer', email:'buyer@demo.com', password:'password123', icon:'🛍️', desc:'Browse & buy' },
  { label:'Seller Demo', email:'u1@artisanbazaar.com', password:'password123', icon:'🏪', desc:'List & sell' },
];

function LoginView({ onLogin, T }:{ onLogin:(u:{role:'buyer'|'seller';name:string;id:string;email?:string})=>void; T:Tokens }) {
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [name, setName]     = useState('');
  const [isReg, setIsReg]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string|null>(null);
  const [error, setError]   = useState('');

  const inp:React.CSSProperties = { width:'100%', marginTop:6, padding:'12px 14px', background:T.offwhite, border:`1.5px solid ${T.line}`, borderRadius:10, fontSize:'0.92rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif', transition:'border-color .2s' };
  const lbl:React.CSSProperties = { fontFamily:'"Inter",sans-serif', fontSize:'0.75rem', fontWeight:600, color:T.inkL };

  const doLogin = async (e:string, p:string, demoLabel?:string) => {
    setError('');
    if (demoLabel) setDemoLoading(demoLabel); else setLoading(true);
    try {
      const res = await api.auth.login(e, p);
      onLogin({role:res.user.role,name:res.user.shopName??res.user.name,id:res.user.id,email:e});
    } catch(err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof TypeError) setError('Cannot reach server. Please wait 30 seconds and try again.');
      else setError('Something went wrong. Please try again.');
    } finally { setLoading(false); setDemoLoading(null); }
  };

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const res = isReg ? await api.auth.register({name,email,password:pass,role:'buyer'}) : await api.auth.login(email,pass);
      onLogin({role:res.user.role,name:res.user.shopName??res.user.name,id:res.user.id,email});
    } catch(e) {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof TypeError) setError('Cannot reach server. Please wait 30 seconds and try again.');
      else setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 16px' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:60, height:60, background:T.forest, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Leaf size={30} color="#fff"/>
          </div>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.8rem', fontWeight:700, color:T.ink, marginBottom:8 }}>
            {isReg ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.88rem', color:T.inkL }}>
            {isReg ? 'Join thousands of artisans and buyers' : 'Sign in to your Artisan Bazaar account'}
          </p>
        </div>

        {!isReg && (
          <div style={{ marginBottom:20 }}>
            <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:700, color:T.inkL, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10, textAlign:'center' }}>Quick Access — Demo Accounts</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.label} onClick={()=>doLogin(acc.email, acc.password, acc.label)}
                  disabled={!!demoLoading || loading}
                  style={{ padding:'14px 12px', background:T.paper, border:`1.5px solid ${T.line}`, borderRadius:12, cursor:'pointer', textAlign:'left', transition:'border-color .15s, box-shadow .15s', position:'relative', opacity:(demoLoading&&demoLoading!==acc.label)?0.5:1 }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.borderColor=T.forest; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 4px 16px ${T.shadow}`; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.borderColor=T.line; (e.currentTarget as HTMLButtonElement).style.boxShadow='none'; }}>
                  {demoLoading===acc.label ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'4px 0' }}>
                      <Loader2 size={16} color={T.forest} style={{animation:'spin 1s linear infinite'}}/>
                      <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', color:T.forest }}>Signing in…</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize:'1.4rem', marginBottom:6 }}>{acc.icon}</div>
                      <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.82rem', fontWeight:700, color:T.ink, marginBottom:2 }}>{acc.label}</p>
                      <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.7rem', color:T.inkL }}>{acc.desc}</p>
                    </>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0' }}>
              <div style={{ flex:1, height:1, background:T.line }}/>
              <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, fontWeight:500 }}>or sign in manually</span>
              <div style={{ flex:1, height:1, background:T.line }}/>
            </div>
          </div>
        )}

        <div style={{ background:T.white, borderRadius:20, padding:'28px', boxShadow:`0 8px 40px ${T.shadowM}`, border:`1px solid ${T.line}` }}>
          {error && (
            <div style={{ padding:'12px 14px', background:'#FFF0EE', border:'1px solid #F5C5BE', borderRadius:10, display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <AlertCircle size={14} color="#9B3D2A"/><span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:'#9B3D2A' }}>{error}</span>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {isReg && (
              <div>
                <label style={lbl}>Full Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="Your full name"/>
              </div>
            )}
            <div>
              <label style={lbl}>Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="your@email.com"/>
            </div>
            <div>
              <label style={lbl}>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={inp} placeholder="••••••••" onKeyDown={e=>{ if(e.key==='Enter') void submit(); }}/>
            </div>
          </div>

          <button onClick={()=>void submit()} disabled={loading}
            style={{ width:'100%', marginTop:24, padding:'14px', background:loading?T.lineD:T.forest, color:'#fff', border:'none', borderRadius:12, fontFamily:'"Inter",sans-serif', fontSize:'0.9rem', fontWeight:600, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .15s' }}>
            {loading?<><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Please wait…</>:<>{isReg?'Create Account':'Sign In'} <ArrowRight size={16}/></>}
          </button>

          <p style={{ textAlign:'center', marginTop:16, fontFamily:'"Inter",sans-serif', fontSize:'0.85rem', color:T.inkL }}>
            {isReg?'Already have an account? ':'New here? '}
            <button onClick={()=>{ setIsReg(r=>!r); setError(''); }} style={{ background:'none', border:'none', color:T.forest, cursor:'pointer', fontWeight:600, fontSize:'0.85rem', fontFamily:'"Inter",sans-serif' }}>
              {isReg?'Sign in':'Create account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── ADMIN / DEVELOPER VIEW ─────────────────────────────────
interface SellerGroup { sellerId:string; sellerName:string; products:Product[]; }

function AdminView({ T, showToast }:{ T:Tokens; showToast:(m:string,t?:'success'|'error')=>void }) {
  const [allProducts, setAllProducts]   = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [deletingId, setDeletingId]     = useState<string|null>(null);
  const [confirmId, setConfirmId]       = useState<string|null>(null);
  const [expandedSeller, setExpandedSeller] = useState<string|null>(null);
  const [searchSeller, setSearchSeller] = useState('');
  const [removedIds, setRemovedIds]     = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    api.products.list({ limit:200 })
      .then(r => setAllProducts(r.data))
      .catch(() => showToast('Could not load products','error'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (pid:string, e:React.MouseEvent) => {
    e.stopPropagation();
    if (confirmId !== pid) { setConfirmId(pid); return; }
    setDeletingId(pid); setConfirmId(null);
    try {
      await api.products.delete(pid);
      setRemovedIds(prev => new Set([...prev, pid]));
      setAllProducts(p => p.filter(x => x.id !== pid));
      showToast('Product removed from marketplace');
    } catch { showToast('Could not remove product','error'); }
    finally { setDeletingId(null); }
  };

  const sellers: SellerGroup[] = Object.values(
    allProducts.reduce((acc, p) => {
      if (!acc[p.sellerId]) acc[p.sellerId] = { sellerId:p.sellerId, sellerName:p.sellerName, products:[] };
      acc[p.sellerId].products.push(p);
      return acc;
    }, {} as Record<string,SellerGroup>)
  ).filter(s => s.sellerName.toLowerCase().includes(searchSeller.toLowerCase()));

  const totalProducts = allProducts.length;
  const totalSellers  = new Set(allProducts.map(p=>p.sellerId)).size;

  return (
    <div style={{ maxWidth:960, margin:'0 auto' }}>
      <div style={{ background:`linear-gradient(135deg,#4A1A7A 0%,#2A0A4A 100%)`, borderRadius:20, padding:'28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:44, height:44, background:'rgba(255,255,255,0.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={22} color="#fff"/>
            </div>
            <div>
              <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.4rem', fontWeight:700, color:'#fff', margin:0 }}>Developer Panel</h2>
              <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', margin:0, letterSpacing:'0.08em' }}>ARTISAN BAZAAR ADMIN</p>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[['Total Products',totalProducts,'📦'],['Total Sellers',totalSellers,'🏪'],['Removed Today',removedIds.size,'🗑️']].map(([l,v,e])=>(
              <div key={String(l)} style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'12px', textAlign:'center', backdropFilter:'blur(4px)' }}>
                <p style={{ fontSize:'1.2rem', marginBottom:4 }}>{e}</p>
                <p style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.4rem', fontWeight:700, color:'#fff', lineHeight:1 }}>{v}</p>
                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.62rem', color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:4 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:20 }}>
        <Search style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:T.inkL }} size={15}/>
        <input type="text" placeholder="Search artisan by name…" value={searchSeller} onChange={e=>setSearchSeller(e.target.value)}
          style={{ width:'100%', paddingLeft:42, paddingRight:16, paddingTop:11, paddingBottom:11, background:T.white, border:`1.5px solid ${T.line}`, borderRadius:12, fontSize:'0.88rem', outline:'none', color:T.ink, fontFamily:'"Inter",sans-serif' }}/>
      </div>

      {loading ? <Spinner label="Loading all artisans…" T={T}/> : sellers.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', color:T.inkM, fontSize:'1.1rem' }}>No artisans found</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {sellers.map(seller => {
            const isOpen = expandedSeller === seller.sellerId;
            return (
              <div key={seller.sellerId} style={{ background:T.white, borderRadius:16, border:`1px solid ${T.line}`, overflow:'hidden', boxShadow:`0 2px 10px ${T.shadow}` }}>
                <button onClick={()=>setExpandedSeller(isOpen?null:seller.sellerId)}
                  style={{ width:'100%', padding:'16px 20px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left' }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#4A1A7A,#7A3AB0)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'"Playfair Display",serif', fontSize:'1.1rem', fontWeight:700, flexShrink:0 }}>
                    {seller.sellerName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'1rem', fontWeight:700, color:T.ink, margin:0 }}>{seller.sellerName}</p>
                    <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', color:T.inkL, margin:'2px 0 0' }}>{seller.products.length} product{seller.products.length!==1?'s':''} listed</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ background:T.forestXL, borderRadius:8, padding:'4px 10px' }}>
                      <span style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.forest, fontWeight:600 }}>{seller.products.length} items</span>
                    </div>
                    <ChevronRight size={16} color={T.inkL} style={{ transform:isOpen?'rotate(90deg)':'rotate(0deg)', transition:'transform .2s' }}/>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.2}}
                      style={{ overflow:'hidden' }}>
                      <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${T.line}` }}>
                        <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, color:'#7A3AB0', textTransform:'uppercase', letterSpacing:'0.1em', padding:'12px 0 10px' }}>
                          Products by {seller.sellerName}
                        </p>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                          {seller.products.map(p => (
                            <div key={p.id} style={{ background:T.offwhite, borderRadius:12, overflow:'hidden', border:`1.5px solid ${confirmId===p.id?T.rust:T.line}`, transition:'border-color .2s' }}>
                              <div style={{ position:'relative', aspectRatio:'1', overflow:'hidden' }}>
                                <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                                {deletingId===p.id && (
                                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <Loader2 size={24} color="#fff" style={{animation:'spin 1s linear infinite'}}/>
                                  </div>
                                )}
                                <div style={{ position:'absolute', top:6, left:6, background:'rgba(255,255,255,0.92)', borderRadius:6, padding:'2px 7px' }}>
                                  <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.58rem', fontWeight:600, color:T.inkM }}>{p.category}</p>
                                </div>
                              </div>
                              <div style={{ padding:'10px 12px' }}>
                                <p style={{ fontFamily:'"Playfair Display",serif', fontStyle:'italic', fontSize:'0.82rem', color:T.ink, marginBottom:2, ...clamp(2) }}>{p.name}</p>
                                <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.78rem', fontWeight:700, color:T.forest, marginBottom:10 }}>₹{p.price}</p>
                                {confirmId===p.id ? (
                                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                    <p style={{ fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.rust, fontWeight:600, textAlign:'center' }}>Not genuine?</p>
                                    <button onClick={e=>handleRemove(p.id,e)} disabled={!!deletingId}
                                      style={{ width:'100%', padding:'7px', background:T.rust, color:'#fff', border:'none', borderRadius:7, fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, cursor:'pointer' }}>
                                      ⚠ Confirm Remove
                                    </button>
                                    <button onClick={e=>{e.stopPropagation();setConfirmId(null);}}
                                      style={{ width:'100%', padding:'6px', background:'transparent', border:`1px solid ${T.line}`, borderRadius:7, fontFamily:'"Inter",sans-serif', fontSize:'0.68rem', color:T.inkL, cursor:'pointer' }}>
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={e=>handleRemove(p.id,e)} disabled={!!deletingId}
                                    style={{ width:'100%', padding:'7px', background:'transparent', color:T.rust, border:`1px solid ${T.rust}`, borderRadius:7, fontFamily:'"Inter",sans-serif', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                                    Remove Product
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}