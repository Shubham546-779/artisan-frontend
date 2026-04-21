
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Heart, Share2, Star, X, ChevronLeft, ChevronRight,
  Download, Copy, Check, TrendingUp, Clock, Zap,
  Edit3, BarChart2, Package, AlertTriangle, Users,
  DollarSign, Flag, Trash2, RefreshCw, Loader2,
  ArrowRight, MapPin, Phone, Mail, ShoppingBag,
  Eye, Tag, Bell, Filter, SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Re-export the Tokens type shape (mirrors App.tsx makeTokens) ──
export type Tokens = Record<string, string>;

// ─────────────────────────────────────────────────────────────────
//  HOOKS
// ─────────────────────────────────────────────────────────────────

/** Persisted wishlist hook. Returns [ids, toggle, has] */
export function useWishlist() {
  const [ids, setIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ab_wishlist') || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem('ab_wishlist', JSON.stringify([...ids])); } catch {}
  }, [ids]);

  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);
  return { ids, toggle, has };
}

/** Recently-viewed products (last 10) */
export function useRecentlyViewed() {
  const [items, setItems] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('ab_recent') || '[]'); } catch { return []; }
  });

  const push = useCallback((product: any) => {
    setItems(prev => {
      const next = [product, ...prev.filter((p: any) => p.id !== product.id)].slice(0, 10);
      try { localStorage.setItem('ab_recent', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { items, push };
}

/** Local order history (persisted) */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => {
    try { return JSON.parse(localStorage.getItem('ab_orders') || '[]'); } catch { return []; }
  });

  const addOrder = useCallback((order: Order) => {
    setOrders(prev => {
      const next = [order, ...prev];
      try { localStorage.setItem('ab_orders', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { orders, addOrder };
}

// ─────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  date: string;
  items: { name: string; imageUrl: string; price: number; qty: number; sellerName: string }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  address: string;
  paymentMethod: 'razorpay' | 'cod';
  coupon?: string;
  discount?: number;
}

// ─────────────────────────────────────────────────────────────────
//  SKELETON CARD  (loading placeholder)
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * {loading ? Array(6).fill(0).map((_,i)=><SkeletonCard key={i} T={T}/>) : <ProductGrid…/>}
 */
export function SkeletonCard({ T }: { T: Tokens }) {
  return (
    <div style={{
      background: T.white, borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${T.line}`, boxShadow: `0 2px 10px ${T.shadow}`,
    }}>
      <style>{`
        @keyframes ab-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .ab-sk { animation: ab-shimmer 1.4s ease infinite;
          background: linear-gradient(90deg,${T.paper} 25%,${T.paperD} 50%,${T.paper} 75%);
          background-size: 800px 100%; }
      `}</style>
      <div className="ab-sk" style={{ aspectRatio: '1', width: '100%' }}/>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="ab-sk" style={{ height: 14, borderRadius: 6, width: '80%' }}/>
        <div className="ab-sk" style={{ height: 11, borderRadius: 6, width: '55%' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <div className="ab-sk" style={{ height: 16, borderRadius: 6, width: '30%' }}/>
          <div className="ab-sk" style={{ height: 28, borderRadius: 7, width: '30%' }}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  WISHLIST BUTTON
// ─────────────────────────────────────────────────────────────────

/**
 * @example <WishlistButton productId={p.id} T={T} wishlist={wishlist}/>
 * where wishlist = useWishlist()
 */
export function WishlistButton({
  productId, T, wishlist, size = 16,
}: { productId: string; T: Tokens; wishlist: ReturnType<typeof useWishlist>; size?: number }) {
  const liked = wishlist.has(productId);
  return (
    <button
      onClick={e => { e.stopPropagation(); wishlist.toggle(productId); }}
      style={{
        background: liked ? '#FFF0EE' : 'rgba(255,255,255,0.9)',
        border: `1.5px solid ${liked ? T.rust : 'rgba(0,0,0,0.08)'}`,
        borderRadius: '50%', width: size + 16, height: size + 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .2s', backdropFilter: 'blur(4px)',
      }}
    >
      <Heart size={size} fill={liked ? T.rust : 'none'} color={liked ? T.rust : T.inkL} strokeWidth={liked ? 2 : 1.5}/>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  WISHLIST DRAWER
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <WishlistDrawer
 *   ids={wishlist.ids} allProducts={products} T={T}
 *   onClose={()=>setWishlistOpen(false)}
 *   onProduct={goToProduct} onAddToCart={addToCart}
 * />
 */
export function WishlistDrawer({
  ids, allProducts, T, onClose, onProduct, onAddToCart,
}: {
  ids: Set<string>; allProducts: any[]; T: Tokens;
  onClose: () => void; onProduct: (p: any) => void; onAddToCart: (p: any) => void;
}) {
  const items = allProducts.filter(p => ids.has(p.id));
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}>
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(400px,100vw)',
            background: T.white, display: 'flex', flexDirection: 'column',
            boxShadow: `-12px 0 48px ${T.shadowL}`,
          }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'env(safe-area-inset-top)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: T.rust, borderRadius: 8, padding: 8, display: 'flex' }}>
                <Heart size={16} color="#fff" fill="#fff"/>
              </div>
              <div>
                <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink, margin: 0 }}>Saved Items</h2>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: 0 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: T.paper, border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.inkM }}>
              <X size={18}/>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {items.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '60px 20px' }}>
                <Heart size={48} color={T.lineD}/>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', color: T.inkM, fontStyle: 'italic', textAlign: 'center' }}>No saved items yet</p>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', color: T.inkL, textAlign: 'center' }}>Tap the ♥ on any product to save it here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(p => (
                  <div key={p.id} style={{ background: T.offwhite, borderRadius: 12, padding: 12, display: 'flex', gap: 12, alignItems: 'center', border: `1px solid ${T.line}`, cursor: 'pointer' }}
                    onClick={() => { onProduct(p); onClose(); }}>
                    <img src={p.imageUrl} alt={p.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.88rem', color: T.ink, margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
                      <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: '0 0 6px' }}>{p.sellerName}</p>
                      <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.9rem', fontWeight: 700, color: T.forest, margin: 0 }}>₹{p.price}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onAddToCart(p); }}
                      style={{ padding: '8px 12px', background: T.forest, color: '#fff', border: 'none', borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PRICE RANGE + RATING + SORT FILTER BAR
// ─────────────────────────────────────────────────────────────────

export interface FilterState {
  minPrice: number; maxPrice: number;
  minRating: number;
  sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating';
}

const DEFAULT_FILTERS: FilterState = { minPrice: 0, maxPrice: 100000, minRating: 0, sort: 'newest' };

/**
 * @example
 * const [filters, setFilters] = useState(DEFAULT_FILTERS);
 * <FilterBar filters={filters} onChange={setFilters} T={T}/>
 *
 * // Then filter products client-side:
 * const visible = applyFilters(products, filters);
 */
export function FilterBar({ filters, onChange, T }: { filters: FilterState; onChange: (f: FilterState) => void; T: Tokens }) {
  const [open, setOpen] = useState(false);
  const active = filters.minPrice > 0 || filters.maxPrice < 100000 || filters.minRating > 0 || filters.sort !== 'newest';

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: active ? T.forestXL : T.paper, border: `1.5px solid ${active ? T.forest : T.line}`, borderRadius: 100, fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: active ? 600 : 400, color: active ? T.forest : T.inkL, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' }}>
        <SlidersHorizontal size={13}/>
        Filter{active ? ' ●' : ''}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setOpen(false)}/>
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              style={{ position: 'absolute', top: '110%', left: 0, zIndex: 201, background: T.white, borderRadius: 16, padding: 20, width: 280, boxShadow: `0 8px 40px ${T.shadowM}`, border: `1px solid ${T.line}` }}>
              {/* Sort */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.7rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sort By</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[['newest', 'Newest'], ['oldest', 'Oldest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓'], ['rating', 'Top Rated']] as const}
                  .map(([val, label]) => (
                    <button key={val} onClick={() => onChange({ ...filters, sort: val })}
                      style={{ padding: '5px 10px', borderRadius: 100, border: `1.5px solid ${filters.sort === val ? T.forest : T.line}`, background: filters.sort === val ? T.forestXL : T.paper, color: filters.sort === val ? T.forest : T.inkL, fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: filters.sort === val ? 600 : 400, cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))
                }
                </div>
              </div>
              {/* Price */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.7rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Price Range — ₹{filters.minPrice} – ₹{filters.maxPrice >= 100000 ? '∞' : filters.maxPrice}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="Min" value={filters.minPrice || ''} onChange={e => onChange({ ...filters, minPrice: Number(e.target.value) || 0 })}
                    style={{ flex: 1, padding: '8px 10px', background: T.offwhite, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: '0.82rem', color: T.ink, fontFamily: '"Inter",sans-serif', outline: 'none' }}/>
                  <input type="number" placeholder="Max" value={filters.maxPrice >= 100000 ? '' : filters.maxPrice} onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) || 100000 })}
                    style={{ flex: 1, padding: '8px 10px', background: T.offwhite, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: '0.82rem', color: T.ink, fontFamily: '"Inter",sans-serif', outline: 'none' }}/>
                </div>
              </div>
              {/* Rating */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.7rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Min Rating</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <button key={r} onClick={() => onChange({ ...filters, minRating: r })}
                      style={{ padding: '5px 10px', borderRadius: 100, border: `1.5px solid ${filters.minRating === r ? '#C9A84C' : T.line}`, background: filters.minRating === r ? '#FFF8E0' : T.paper, color: filters.minRating === r ? '#A07820' : T.inkL, fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: filters.minRating === r ? 600 : 400, cursor: 'pointer' }}>
                      {r === 0 ? 'Any' : `${r}★`}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { onChange(DEFAULT_FILTERS); setOpen(false); }}
                  style={{ flex: 1, padding: '9px', background: T.paper, color: T.inkL, border: `1px solid ${T.line}`, borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', cursor: 'pointer' }}>Reset</button>
                <button onClick={() => setOpen(false)}
                  style={{ flex: 1, padding: '9px', background: T.forest, color: '#fff', border: 'none', borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Apply</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Apply filter state to a product array client-side */
export function applyFilters(products: any[], f: FilterState): any[] {
  return products
    .filter(p => p.price >= f.minPrice && p.price <= f.maxPrice)
    .filter(p => (p.rating ?? 0) >= f.minRating)
    .sort((a, b) => {
      if (f.sort === 'price_asc') return a.price - b.price;
      if (f.sort === 'price_desc') return b.price - a.price;
      if (f.sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (f.sort === 'oldest') return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
}

// ─────────────────────────────────────────────────────────────────
//  PRODUCT IMAGE GALLERY  (swipe, keyboard, zoom)
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <ProductImageGallery images={[product.imageUrl, ...product.extraImages ?? []]} T={T}/>
 */
export function ProductImageGallery({ images, T }: { images: string[]; T: Tokens }) {
  const [idx, setIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(images.length - 1, i + 1));
      if (e.key === 'Escape') setZoomed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Main image */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: T.paper, cursor: 'zoom-in' }}
        onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (dx > 50 && idx > 0) setIdx(i => i - 1);
          if (dx < -50 && idx < images.length - 1) setIdx(i => i + 1);
        }}
        onClick={() => setZoomed(true)}>
        <img src={images[idx]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', transition: 'opacity .2s' }}/>
        {images.length > 1 && (
          <>
            {idx > 0 && (
              <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <ChevronLeft size={16} color={T.inkM}/>
              </button>
            )}
            {idx < images.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <ChevronRight size={16} color={T.inkM}/>
              </button>
            )}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
              {images.map((_, i) => (
                <div key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all .2s', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setIdx(i); }}/>
              ))}
            </div>
          </>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 6, padding: '3px 8px', fontFamily: '"Inter",sans-serif', fontSize: '0.68rem' }}>
          🔍 Tap to zoom
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {images.map((img, i) => (
            <img key={i} src={img} alt="" onClick={() => setIdx(i)}
              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0, cursor: 'pointer', border: `2px solid ${i === idx ? T.forest : 'transparent'}`, opacity: i === idx ? 1 : 0.65, transition: 'all .15s' }}/>
          ))}
        </div>
      )}

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
            <button onClick={() => setZoomed(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={20}/>
            </button>
            <motion.img src={images[idx]} alt="" initial={{ scale: 0.85 }} animate={{ scale: 1 }}
              style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8 }}/>
            {images.length > 1 && (
              <>
                {idx > 0 && (
                  <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
                    style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <ChevronLeft size={22}/>
                  </button>
                )}
                {idx < images.length - 1 && (
                  <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <ChevronRight size={22}/>
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SHARE PRODUCT SHEET
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * const [shareOpen, setShareOpen] = useState(false);
 * <button onClick={()=>setShareOpen(true)}><Share2/></button>
 * <AnimatePresence>{shareOpen && <ShareProductSheet product={p} T={T} onClose={()=>setShareOpen(false)}/>}</AnimatePresence>
 */
export function ShareProductSheet({ product, T, onClose }: { product: any; T: Tokens; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}?product=${product.id}`;
  const text = `Check out "${product.name}" by ${product.sellerName} on Artisan Bazaar — ₹${product.price}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  const ig = () => { copy(); alert('Link copied! Open Instagram and paste it.'); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ background: T.white, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 24px 36px', boxShadow: `0 -8px 40px ${T.shadowL}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink }}>Share This Craft</h2>
          <button onClick={onClose} style={{ background: T.paper, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={T.inkM}/></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.paper, borderRadius: 12, padding: 12, marginBottom: 20 }}>
          <img src={product.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.88rem', color: T.ink, margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.name}</p>
            <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: 0 }}>₹{product.price}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: '💬', label: 'WhatsApp', action: wa, color: '#25D366', bg: '#E8FBF0' },
            { icon: '📸', label: 'Instagram', action: ig, color: '#E1306C', bg: '#FCE8F0' },
            { icon: copied ? '✓' : '🔗', label: copied ? 'Copied!' : 'Copy Link', action: copy, color: T.forest, bg: T.forestXL },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', background: btn.bg, border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'transform .1s' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{btn.icon}</span>
              <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: btn.color }}>{btn.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.paper, borderRadius: 10, padding: '10px 14px' }}>
          <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.75rem', color: T.inkL, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{url}</span>
          <button onClick={copy} style={{ padding: '6px 12px', background: T.forest, color: '#fff', border: 'none', borderRadius: 7, fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  REVIEW SUBMIT MODAL
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <ReviewSubmitModal productId={p.id} productName={p.name} T={T}
 *   onClose={()=>setReviewOpen(false)}
 *   onSubmit={async(r)=>{ await api.reviews.create(r); showToast('Review submitted!') }}
 * />
 */
export function ReviewSubmitModal({ productId, productName, T, onClose, onSubmit }: {
  productId: string; productName: string; T: Tokens;
  onClose: () => void;
  onSubmit: (review: { productId: string; rating: number; comment: string }) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try { await onSubmit({ productId, rating, comment }); onClose(); }
    finally { setLoading(false); }
  };

  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: T.white, borderRadius: 20, padding: '28px 24px', maxWidth: 400, width: '100%', boxShadow: `0 24px 64px ${T.shadowL}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.2rem', fontWeight: 700, color: T.ink }}>Leave a Review</h2>
          <button onClick={onClose} style={{ background: T.paper, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={T.inkM}/></button>
        </div>

        <p style={{ fontFamily: '"Crimson Pro",serif', fontStyle: 'italic', fontSize: '0.95rem', color: T.inkL, marginBottom: 20 }}>{productName}</p>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} size={32} style={{ cursor: 'pointer', transition: 'transform .1s' }}
                fill={s <= (hoveredStar || rating) ? '#C9A84C' : 'none'}
                color={s <= (hoveredStar || rating) ? '#C9A84C' : T.lineD}
                onMouseEnter={() => setHoveredStar(s)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(s)}/>
            ))}
          </div>
          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#C9A84C' }}>{LABELS[hoveredStar || rating]}</p>
        </div>

        <textarea rows={4} value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Tell others about your experience with this product…"
          style={{ width: '100%', padding: '12px 14px', background: T.offwhite, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: '0.9rem', color: T.ink, fontFamily: '"Inter",sans-serif', outline: 'none', resize: 'vertical', marginBottom: 16 }}/>

        <button onClick={submit} disabled={loading}
          style={{ width: '100%', padding: 13, background: loading ? T.inkL : T.forest, color: '#fff', border: 'none', borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Submitting…</> : 'Submit Review ✦'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  RECENTLY VIEWED BAR
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * const recentlyViewed = useRecentlyViewed();
 * // Call recentlyViewed.push(product) in goToProduct()
 * <RecentlyViewedBar items={recentlyViewed.items} onProduct={goToProduct} T={T}/>
 */
export function RecentlyViewedBar({ items, onProduct, T }: { items: any[]; onProduct: (p: any) => void; T: Tokens }) {
  if (!items.length) return null;
  return (
    <div style={{ padding: '20px 16px 0' }}>
      <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={12}/> Recently Viewed
      </p>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {items.map(p => (
          <div key={p.id} onClick={() => onProduct(p)} style={{ flexShrink: 0, cursor: 'pointer', textAlign: 'center', width: 68 }}>
            <img src={p.imageUrl} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 10, border: `2px solid ${T.line}`, display: 'block', margin: '0 auto 4px' }}/>
            <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.6rem', color: T.inkL, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>₹{p.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FLASH SALE BANNER
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <FlashSaleBanner endsAt={new Date(Date.now()+3600000)} discount={20} T={T} onShop={()=>setSelectedCat('All')}/>
 */
export function FlashSaleBanner({ endsAt, discount, T, onShop }: { endsAt: Date; discount: number; T: Tokens; onShop: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = endsAt.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (timeLeft === 'Expired') return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'linear-gradient(135deg,#9B1B10 0%,#D04B20 100%)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Zap size={18} color="#FFD700" fill="#FFD700"/>
        <div>
          <p style={{ fontFamily: '"Playfair Display",serif', fontWeight: 700, fontSize: '1rem', color: '#fff', margin: 0, lineHeight: 1.2 }}>Flash Sale — {discount}% Off Everything!</p>
          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Limited time offer</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '6px 12px', fontFamily: 'monospace', fontSize: '1rem', color: '#FFD700', fontWeight: 700, letterSpacing: '0.1em' }}>
          {timeLeft}
        </div>
        <button onClick={onShop} style={{ padding: '8px 16px', background: '#FFD700', color: '#4A1000', border: 'none', borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Shop Now
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TRENDING + NEW ARRIVALS SECTIONS
// ─────────────────────────────────────────────────────────────────

export function TrendingSection({ products, onProduct, onAddToCart, T }: {
  products: any[]; onProduct: (p: any) => void; onAddToCart: (p: any) => void; T: Tokens;
}) {
  const top = products.slice(0, 8);
  if (!top.length) return null;
  return (
    <div style={{ padding: '28px 16px 0', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <TrendingUp size={20} color={T.forest}/>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.2rem', fontWeight: 700, color: T.ink }}>Trending Now</h2>
        <div style={{ flex: 1, height: 1, background: T.line }}/>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {top.map((p, i) => (
          <div key={p.id} onClick={() => onProduct(p)} style={{ flexShrink: 0, width: 140, background: T.white, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${T.line}`, boxShadow: `0 2px 10px ${T.shadow}`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, background: T.forest, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter",sans-serif', fontSize: '0.62rem', fontWeight: 700 }}>#{i + 1}</div>
            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}/>
            <div style={{ padding: '8px 10px' }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.78rem', color: T.ink, margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', fontWeight: 700, color: T.ink }}>₹{p.price}</span>
                <button onClick={e => { e.stopPropagation(); onAddToCart(p); }} style={{ padding: '4px 8px', background: T.forest, color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', fontFamily: '"Inter",sans-serif' }}>Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewArrivalsSection({ products, onProduct, T }: {
  products: any[]; onProduct: (p: any) => void; T: Tokens;
}) {
  const newest = [...products].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 6);
  if (!newest.length) return null;
  return (
    <div style={{ padding: '28px 16px 0', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.1rem' }}>✨</span>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.2rem', fontWeight: 700, color: T.ink }}>New Arrivals</h2>
        <div style={{ flex: 1, height: 1, background: T.line }}/>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {newest.map(p => (
          <div key={p.id} onClick={() => onProduct(p)} style={{ flexShrink: 0, width: 140, background: T.white, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${T.line}`, boxShadow: `0 2px 10px ${T.shadow}` }}>
            <div style={{ position: 'relative' }}>
              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}/>
              <div style={{ position: 'absolute', top: 8, left: 8, background: T.gold, color: '#4A3000', borderRadius: 6, padding: '2px 8px', fontFamily: '"Inter",sans-serif', fontSize: '0.6rem', fontWeight: 700 }}>NEW</div>
            </div>
            <div style={{ padding: '8px 10px' }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.78rem', color: T.ink, margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
              <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', fontWeight: 700, color: T.ink }}>₹{p.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COUPON INPUT
// ─────────────────────────────────────────────────────────────────

const COUPONS: Record<string, number> = {
  'WELCOME10': 10, 'CRAFT20': 20, 'ARTISAN15': 15,
  'FIRST30': 30, 'DIWALI25': 25,
};

/**
 * @example
 * const [coupon, setCoupon] = useState<{code:string;discount:number}|null>(null);
 * <CouponInput T={T} onApply={setCoupon} total={total}/>
 */
export function CouponInput({ T, onApply, total }: { T: Tokens; onApply: (c: { code: string; discount: number } | null) => void; total: number }) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [error, setError] = useState('');

  const apply = () => {
    const pct = COUPONS[code.toUpperCase().trim()];
    if (!pct) { setError('Invalid coupon code'); return; }
    const c = { code: code.toUpperCase().trim(), discount: pct };
    setApplied(c); onApply(c); setError('');
  };

  const remove = () => { setApplied(null); onApply(null); setCode(''); setError(''); };

  if (applied) {
    const savings = (total * applied.discount) / 100;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#E8F8E8', border: '1px solid #A0CFA0', borderRadius: 10, padding: '10px 14px' }}>
        <div>
          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 700, color: '#2D5A2D', margin: 0 }}>🎉 "{applied.code}" applied! −{applied.discount}%</p>
          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: '#4A7A4A', margin: 0 }}>You save ₹{savings.toFixed(2)}</p>
        </div>
        <button onClick={remove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A7A4A', padding: 4 }}><X size={14}/></button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="Enter coupon code" value={code} onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && apply()}
          style={{ flex: 1, padding: '10px 12px', background: T.offwhite, border: `1.5px solid ${error ? T.rust : T.line}`, borderRadius: 8, fontSize: '0.85rem', color: T.ink, fontFamily: '"Inter",sans-serif', outline: 'none', textTransform: 'uppercase' }}/>
        <button onClick={apply} style={{ padding: '10px 16px', background: T.forest, color: '#fff', border: 'none', borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Apply</button>
      </div>
      {error && <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.rust, marginTop: 6 }}>✗ {error}</p>}
      <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.68rem', color: T.inkL, marginTop: 6 }}>Try: WELCOME10, CRAFT20, ARTISAN15, FIRST30</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  RAZORPAY PAYMENT BUTTON
// ─────────────────────────────────────────────────────────────────

/**
 * Add Razorpay script to index.html:
 *   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 *
 * Set VITE_RAZORPAY_KEY_ID in your .env file.
 *
 * @example
 * <RazorpayButton amount={total} name="Artisan Bazaar" description="Handcrafted order"
 *   prefill={{ name: form.name, email: form.email, contact: form.mobile }}
 *   T={T} onSuccess={handleOrderSuccess} onFailure={()=>showToast('Payment failed','error')}
 * />
 */
export function RazorpayButton({ amount, name, description, prefill, T, onSuccess, onFailure, disabled }: {
  amount: number; name: string; description: string;
  prefill?: { name: string; email: string; contact: string };
  T: Tokens; onSuccess: (paymentId: string) => void; onFailure: () => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const pay = () => {
    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) { alert('Razorpay not loaded. Add the script to index.html.'); return; }
    setLoading(true);

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY',
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      name,
      description,
      prefill,
      theme: { color: T.forest },
      handler: (response: any) => {
        setLoading(false);
        onSuccess(response.razorpay_payment_id);
      },
      modal: { ondismiss: () => setLoading(false) },
    };

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', () => { setLoading(false); onFailure(); });
      rzp.open();
    } catch { setLoading(false); onFailure(); }
  };

  return (
    <button onClick={pay} disabled={disabled || loading}
      style={{ width: '100%', padding: 13, background: disabled || loading ? T.lineD : '#0A5299', color: '#fff', border: 'none', borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Opening Razorpay…</> : <>💳 Pay ₹{amount.toFixed(2)} with Razorpay</>}
    </button>
  );
}

/** Cash-on-Delivery option component */
export function CashOnDeliveryOption({ selected, onSelect, T }: { selected: boolean; onSelect: () => void; T: Tokens }) {
  return (
    <button onClick={onSelect}
      style={{ width: '100%', padding: '12px 16px', background: selected ? T.forestXL : T.offwhite, border: `1.5px solid ${selected ? T.forest : T.line}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all .15s', textAlign: 'left' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? T.forest : T.lineD}`, background: selected ? T.forest : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}/>}
      </div>
      <div>
        <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', fontWeight: 600, color: T.ink, margin: 0 }}>💵 Cash on Delivery</p>
        <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: 0 }}>Pay when your order arrives</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ORDER HISTORY VIEW
// ─────────────────────────────────────────────────────────────────

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];
const STATUS_LABELS: Record<string, string> = { pending: 'Placed', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_COLORS: Record<string, string> = { pending: '#C9A84C', confirmed: '#3D7A9A', shipped: '#7A5AAA', delivered: '#2D7A2D', cancelled: '#9B3D2A' };

/**
 * @example <OrderHistoryView orders={orders} T={T} onProduct={goToProduct}/>
 * where orders = useOrders().orders
 */
export function OrderHistoryView({ orders, T, onProduct }: { orders: Order[]; T: Tokens; onProduct?: (p: any) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!orders.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <ShoppingBag size={48} color={T.lineD} style={{ margin: '0 auto 16px', display: 'block' }}/>
      <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', color: T.inkM, fontSize: '1.1rem' }}>No orders yet</p>
      <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', color: T.inkL, marginTop: 8 }}>Your order history will appear here</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {orders.map(order => {
        const isOpen = expanded === order.id;
        const stepIdx = STATUS_STEPS.indexOf(order.status);
        const color = STATUS_COLORS[order.status] || T.inkL;

        return (
          <div key={order.id} style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.line}`, overflow: 'hidden', boxShadow: `0 2px 10px ${T.shadow}` }}>
            <button onClick={() => setExpanded(isOpen ? null : order.id)}
              style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${color}40` }}>
                  <Package size={18} color={color}/>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: T.ink, margin: 0 }}>{order.id}</p>
                  <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.7rem', fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 100 }}>{STATUS_LABELS[order.status]}</span>
                </div>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: '0 0 2px' }}>{new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', fontWeight: 600, color: T.forest, margin: 0 }}>₹{order.total.toFixed(2)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
              </div>
              <ChevronRight size={16} color={T.inkL} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}/>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.line}` }}>
                    {/* Progress bar */}
                    {order.status !== 'cancelled' && (
                      <div style={{ padding: '16px 0 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          {STATUS_STEPS.map((step, i) => {
                            const done = i <= stepIdx;
                            return (
                              <React.Fragment key={step}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: i < STATUS_STEPS.length - 1 ? undefined : undefined }}>
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? T.forest : T.paper, border: `2px solid ${done ? T.forest : T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
                                    {done && <Check size={12} color="#fff"/>}
                                  </div>
                                  <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.6rem', color: done ? T.forest : T.inkL, fontWeight: done ? 600 : 400, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>{STATUS_LABELS[step]}</p>
                                </div>
                                {i < STATUS_STEPS.length - 1 && (
                                  <div style={{ flex: 1, height: 2, background: i < stepIdx ? T.forest : T.line, margin: '0 4px', marginBottom: 20, transition: 'background .3s' }}/>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {order.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={item.imageUrl} alt={item.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.82rem', color: T.ink, margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.name}</p>
                            <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.7rem', color: T.inkL, margin: 0 }}>{item.sellerName} · x{item.qty}</p>
                          </div>
                          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', fontWeight: 600, color: T.forest, flexShrink: 0 }}>₹{(item.price * item.qty).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: T.paper, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL }}>Payment</span>
                        <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkM, textTransform: 'uppercase' }}>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 600, color: T.inkM }}>Total</span>
                        <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.88rem', fontWeight: 700, color: T.ink }}>₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  EDIT PROFILE MODAL
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <EditProfileModal user={user} T={T} onClose={()=>setEditOpen(false)}
 *   onSave={async(data)=>{ await api.auth.updateProfile(data); setUser({...user,...data}); showToast('Profile updated!') }}
 * />
 */
export function EditProfileModal({ user, T, onClose, onSave }: {
  user: { name: string; email?: string };
  T: Tokens; onClose: () => void;
  onSave: (data: { name?: string; bio?: string; location?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const inp: React.CSSProperties = { width: '100%', marginTop: 6, padding: '11px 14px', background: T.offwhite, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: '0.9rem', outline: 'none', color: T.ink, fontFamily: '"Inter",sans-serif' };

  const save = async () => {
    setLoading(true);
    try { await onSave({ name: name.trim(), bio, location }); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: T.white, borderRadius: 20, padding: '28px 24px', maxWidth: 400, width: '100%', boxShadow: `0 24px 64px ${T.shadowL}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.2rem', fontWeight: 700, color: T.ink }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: T.paper, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={T.inkM}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Display Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bio</label>
            <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell buyers about yourself…" style={{ ...inp, resize: 'vertical' }}/>
          </div>
          <div>
            <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</label>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <MapPin style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.inkL }} size={14}/>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mumbai, Maharashtra" style={{ ...inp, marginTop: 0, paddingLeft: 34 }}/>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: T.paper, color: T.inkL, border: `1px solid ${T.line}`, borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={loading}
            style={{ flex: 2, padding: 12, background: loading ? T.inkL : T.forest, color: '#fff', border: 'none', borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FORGOT PASSWORD MODAL
// ─────────────────────────────────────────────────────────────────

export function ForgotPasswordModal({ T, onClose }: { T: Tokens; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!email.includes('@')) return;
    setLoading(true);
    // Replace with your actual API call: await api.auth.forgotPassword(email)
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false); setSent(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{ background: T.white, borderRadius: 20, padding: '32px 28px', maxWidth: 380, width: '100%', boxShadow: `0 24px 64px ${T.shadowL}` }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📬</div>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.3rem', fontWeight: 700, color: T.ink, marginBottom: 10 }}>Check Your Email</h2>
            <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', color: T.inkL, marginBottom: 24, lineHeight: 1.6 }}>We've sent a password reset link to <strong style={{ color: T.ink }}>{email}</strong>.</p>
            <button onClick={onClose} style={{ width: '100%', padding: 12, background: T.forest, color: '#fff', border: 'none', borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.2rem', fontWeight: 700, color: T.ink }}>Reset Password</h2>
              <button onClick={onClose} style={{ background: T.paper, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={T.inkM}/></button>
            </div>
            <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', color: T.inkL, marginBottom: 20, lineHeight: 1.6 }}>Enter your email and we'll send you a reset link.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                onKeyDown={e => e.key === 'Enter' && send()} autoFocus
                style={{ width: '100%', marginTop: 6, padding: '12px 14px', background: T.offwhite, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: '0.9rem', outline: 'none', color: T.ink, fontFamily: '"Inter",sans-serif' }}/>
            </div>
            <button onClick={send} disabled={loading || !email.includes('@')}
              style={{ width: '100%', padding: 13, background: loading || !email.includes('@') ? T.lineD : T.forest, color: '#fff', border: 'none', borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: loading || !email.includes('@') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Sending…</> : 'Send Reset Link'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  EDIT LISTING MODAL
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <EditListingModal product={selectedProduct} T={T}
 *   onClose={()=>setEditProduct(null)}
 *   onSave={async(updates)=>{ await api.products.update(product.id, updates); showToast('Listing updated!') }}
 * />
 */
export function EditListingModal({ product, T, onClose, onSave }: {
  product: any; T: Tokens; onClose: () => void;
  onSave: (updates: any) => Promise<void>;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? '');
  const [stock, setStock] = useState(product.stock ?? 10);
  const [loading, setLoading] = useState(false);

  const inp: React.CSSProperties = { width: '100%', marginTop: 6, padding: '11px 14px', background: T.offwhite, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: '0.9rem', outline: 'none', color: T.ink, fontFamily: '"Inter",sans-serif' };

  const save = async () => {
    setLoading(true);
    try { await onSave({ name, price: Number(price), description, stock: Number(stock) }); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{ background: T.white, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: `0 -8px 40px ${T.shadowL}` }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Edit3 size={18} color={T.forest}/>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink, margin: 0 }}>Edit Listing</h2>
          </div>
          <button onClick={onClose} style={{ background: T.paper, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={T.inkM}/></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.paper, borderRadius: 12, padding: 12 }}>
            <img src={product.imageUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
            <p style={{ fontFamily: '"Crimson Pro",serif', fontStyle: 'italic', fontSize: '0.9rem', color: T.inkL }}>Editing: {product.name}</p>
          </div>
          <div>
            <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Item Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inp}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price (₹)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock Qty</label>
              <input type="number" min={0} value={stock} onChange={e => setStock(Number(e.target.value))} style={inp}/>
            </div>
          </div>
          <div>
            <label style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</label>
            <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, resize: 'vertical' }}/>
          </div>
          {Number(stock) === 0 && (
            <div style={{ padding: '10px 14px', background: '#FFF0EE', border: '1px solid #F5C5BE', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color={T.rust}/>
              <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', color: T.rust }}>Stock = 0 will mark this item as <strong>Sold Out</strong></span>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.line}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: T.paper, color: T.inkL, border: `1px solid ${T.line}`, borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={loading}
            style={{ flex: 2, padding: 12, background: loading ? T.inkL : T.forest, color: '#fff', border: 'none', borderRadius: 10, fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> Saving…</> : <>Save Changes <ArrowRight size={14}/></>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  STOCK BADGE  (sold-out overlay)
// ─────────────────────────────────────────────────────────────────

/** Wrap around a product card image to show sold-out state */
export function StockBadge({ stock, T, children }: { stock: number; T: Tokens; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {stock === 0 && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit' }}>
          <div style={{ background: T.rust, color: '#fff', fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sold Out</div>
        </div>
      )}
      {stock > 0 && stock <= 5 && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(180,80,20,0.9)', color: '#fff', fontFamily: '"Inter",sans-serif', fontSize: '0.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: 100 }}>
          Only {stock} left!
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SALES DASHBOARD (Seller)
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * <SalesDashboard sellerId={user.id} products={myProducts} orders={allOrders} T={T}/>
 */
export function SalesDashboard({ products, orders, T }: {
  products: any[]; orders: Order[]; T: Tokens;
}) {
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

  const productRevenue = products.map(p => {
    const rev = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => {
      const item = o.items.find(i => i.name === p.name);
      return sum + (item ? item.price * item.qty : 0);
    }, 0);
    return { ...p, revenue: rev };
  }).sort((a, b) => b.revenue - a.revenue);

  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: <DollarSign size={18} color={T.forest}/>, color: T.forestXL },
    { label: 'Total Orders', value: totalOrders, icon: <ShoppingBag size={18} color='#5A3AAA'/>, color: '#EDE8F8' },
    { label: 'Avg Order', value: `₹${avgOrder.toFixed(0)}`, icon: <BarChart2 size={18} color='#3A6AAA'/>, color: '#E0EEFF' },
    { label: 'Products', value: products.length, icon: <Package size={18} color={T.earth}/>, color: T.earthXL },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: color, borderRadius: 14, padding: '16px 14px', border: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {icon}
              <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.68rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
            </div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.4rem', fontWeight: 700, color: T.ink, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {productRevenue.length > 0 && (
        <div>
          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Top Products by Revenue</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {productRevenue.slice(0, 5).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.offwhite, borderRadius: 12, padding: '10px 12px', border: `1px solid ${T.line}` }}>
                <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 700, color: T.inkL, width: 20, textAlign: 'center' }}>#{i + 1}</span>
                <img src={p.imageUrl} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.82rem', color: T.ink, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
                  <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.7rem', color: T.inkL, margin: 0 }}>₹{p.price} each</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.82rem', fontWeight: 700, color: T.forest, margin: 0 }}>₹{p.revenue.toFixed(0)}</p>
                  <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.62rem', color: T.inkL, margin: 0 }}>revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  INVOICE PDF  (printable/downloadable receipt)
// ─────────────────────────────────────────────────────────────────

/** Opens a print dialog / download. Call on the success screen. */
export function downloadInvoice(order: Order) {
  const html = `
<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Invoice ${order.id}</title>
<style>
  body { font-family: Georgia, serif; max-width: 600px; margin: 40px auto; color: #1C1410; }
  h1 { font-size: 2rem; color: #2D4A2D; margin: 0 0 4px; }
  .sub { font-size: 0.85rem; color: #7A6E64; margin: 0 0 32px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #7A6E64; border-bottom: 2px solid #E2DDD5; padding: 8px 0; }
  td { padding: 10px 0; border-bottom: 1px solid #E2DDD5; font-size: 0.9rem; }
  .total { font-size: 1.1rem; font-weight: bold; }
  .badge { display: inline-block; background: #E8F0E8; color: #2D4A2D; border-radius: 4px; padding: 2px 8px; font-family: sans-serif; font-size: 0.75rem; font-weight: bold; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>🌿 Artisan Bazaar</h1>
<p class="sub">Invoice · ${order.id}</p>
<hr/>
<p style="font-size:0.85rem;color:#7A6E64">Date: ${new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<p style="font-size:0.85rem;color:#7A6E64">Delivery: ${order.address}</p>
<p style="font-size:0.85rem;color:#7A6E64">Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay'}</p>
<table>
  <tr><th>Item</th><th>Seller</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th></tr>
  ${order.items.map(i => `<tr><td>${i.name}</td><td style="color:#7A6E64;font-size:0.82rem">${i.sellerName}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">₹${(i.price * i.qty).toFixed(2)}</td></tr>`).join('')}
  <tr><td colspan="3" class="total" style="text-align:right;padding-top:16px">Total</td><td class="total" style="text-align:right;padding-top:16px">₹${order.total.toFixed(2)}</td></tr>
</table>
<p style="font-size:0.8rem;color:#7A6E64;text-align:center;margin-top:40px">Thank you for supporting Indian artisans 🌿</p>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

/** Button that triggers invoice download */
export function InvoiceButton({ order, T }: { order: Order; T: Tokens }) {
  return (
    <button onClick={() => downloadInvoice(order)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: T.paper, color: T.inkM, border: `1px solid ${T.line}`, borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer' }}>
      <Download size={13}/> Download Invoice
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ADMIN — USER MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * // Inside your AdminView, add a tab:
 * {tab === 'users' && <UserManagementTab T={T} showToast={showToast}/>}
 */
export function UserManagementTab({ T, showToast }: { T: Tokens; showToast: (m: string, t?: 'success' | 'error') => void }) {
  // Replace with api.users.list() when your backend supports it
  const [users] = useState([
    { id: 'u1', name: 'Priya Sharma', email: 'priya@test.com', role: 'seller', banned: false, products: 4, joinDate: '2024-01-15' },
    { id: 'u2', name: 'Rahul Verma', email: 'rahul@test.com', role: 'buyer', banned: false, products: 0, joinDate: '2024-02-20' },
    { id: 'u3', name: 'Ananya Craft', email: 'ananya@test.com', role: 'seller', banned: false, products: 7, joinDate: '2024-03-05' },
  ]);
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Users size={18} color={T.forest}/>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink }}>User Management</h3>
      </div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', background: T.white, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: '0.85rem', color: T.ink, fontFamily: '"Inter",sans-serif', outline: 'none' }}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(u => {
          const isBanned = banned.has(u.id);
          return (
            <div key={u.id} style={{ background: T.white, borderRadius: 12, padding: '12px 16px', border: `1px solid ${isBanned ? T.rust : T.line}`, display: 'flex', alignItems: 'center', gap: 14, opacity: isBanned ? 0.6 : 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.role === 'seller' ? T.forestXL : T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: '1rem', fontWeight: 700, color: u.role === 'seller' ? T.forest : T.inkM }}>{u.name[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.85rem', fontWeight: 600, color: T.ink, margin: 0 }}>{u.name}</p>
                  <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.62rem', fontWeight: 600, color: u.role === 'seller' ? T.forest : T.inkL, background: u.role === 'seller' ? T.forestXL : T.paper, padding: '1px 6px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{u.role}</span>
                  {isBanned && <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.62rem', fontWeight: 600, color: T.rust, background: '#FFE8E5', padding: '1px 6px', borderRadius: 100 }}>BANNED</span>}
                </div>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: 0 }}>{u.email} · {u.role === 'seller' ? `${u.products} products` : 'Buyer'} · Joined {new Date(u.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
              </div>
              <button onClick={() => {
                setBanned(prev => { const next = new Set(prev); next.has(u.id) ? next.delete(u.id) : next.add(u.id); return next; });
                showToast(isBanned ? `${u.name} unbanned` : `${u.name} banned`, isBanned ? 'success' : 'error');
              }}
                style={{ padding: '6px 12px', background: isBanned ? T.forestXL : '#FFF0EE', color: isBanned ? T.forest : T.rust, border: `1px solid ${isBanned ? T.forest : T.rust}`, borderRadius: 8, fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                {isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ADMIN — REVENUE ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────

export function RevenueAnalyticsTab({ products, T }: { products: any[]; T: Tokens }) {
  // Simulate last 7 days revenue data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), revenue: Math.floor(Math.random() * 5000) + 500 };
  });
  const maxRev = Math.max(...days.map(d => d.revenue));
  const totalRev = days.reduce((s, d) => s + d.revenue, 0);

  const catRevenue = ['Jewelry', 'Home Decor', 'Clothing', 'Art', 'Toys', 'Gifts', 'Other'].map(cat => ({
    cat, count: products.filter(p => p.category === cat).length,
    pct: Math.round(products.filter(p => p.category === cat).length / Math.max(products.length, 1) * 100),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: -8 }}>
        <BarChart2 size={18} color={T.forest}/>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink }}>Revenue Analytics</h3>
      </div>

      <div style={{ background: T.white, borderRadius: 14, padding: '20px', border: `1px solid ${T.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last 7 Days</p>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.2rem', fontWeight: 700, color: T.forest }}>₹{totalRev.toLocaleString()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
          {days.map(d => (
            <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: T.forest, borderRadius: '4px 4px 0 0', height: `${Math.round((d.revenue / maxRev) * 80)}px`, minHeight: 4, transition: 'height .3s' }}/>
              <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.6rem', color: T.inkL }}>{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.white, borderRadius: 14, padding: '20px', border: `1px solid ${T.line}` }}>
        <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Products by Category</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catRevenue.filter(c => c.count > 0).map(c => (
            <div key={c.cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', color: T.inkM }}>{c.cat}</span>
                <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL }}>{c.count} items · {c.pct}%</span>
              </div>
              <div style={{ height: 6, background: T.paper, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.pct}%`, background: T.forest, borderRadius: 3, transition: 'width .4s ease' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ADMIN — REPORTED PRODUCTS TAB
// ─────────────────────────────────────────────────────────────────

export function ReportedProductsTab({ products, T, showToast, onRemove }: {
  products: any[]; T: Tokens;
  showToast: (m: string, t?: 'success' | 'error') => void;
  onRemove: (id: string) => void;
}) {
  // In a real app, fetch reported products from api.reports.list()
  const [reported, setReported] = useState(products.slice(0, 3).map(p => ({ ...p, reason: 'Fake/counterfeit item', reports: Math.floor(Math.random() * 5) + 1 })));
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = (id: string) => { setDismissed(prev => new Set([...prev, id])); showToast('Report dismissed'); };
  const remove = (id: string) => { setReported(r => r.filter(p => p.id !== id)); onRemove(id); showToast('Product removed', 'error'); };

  const visible = reported.filter(p => !dismissed.has(p.id));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Flag size={18} color={T.rust}/>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink }}>Reported Products</h3>
        {visible.length > 0 && <span style={{ background: T.rust, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter",sans-serif', fontSize: '0.65rem', fontWeight: 700 }}>{visible.length}</span>}
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: T.white, borderRadius: 14, border: `1px solid ${T.line}` }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', color: T.inkM, fontSize: '1rem' }}>No pending reports 🎉</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(p => (
            <div key={p.id} style={{ background: T.white, borderRadius: 12, border: `1.5px solid #F5C5BE`, padding: '14px', display: 'flex', gap: 12 }}>
              <img src={p.imageUrl} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.88rem', color: T.ink, margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL, margin: '0 0 6px' }}>by {p.sellerName}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flag size={11} color={T.rust}/>
                  <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.rust, fontWeight: 600 }}>{p.reports} report{p.reports !== 1 ? 's' : ''}: {p.reason}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => remove(p.id)} style={{ padding: '6px 10px', background: T.rust, color: '#fff', border: 'none', borderRadius: 7, fontFamily: '"Inter",sans-serif', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                <button onClick={() => dismiss(p.id)} style={{ padding: '6px 10px', background: T.paper, color: T.inkL, border: `1px solid ${T.line}`, borderRadius: 7, fontFamily: '"Inter",sans-serif', fontSize: '0.68rem', cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  REPORT PRODUCT BUTTON  (buyer flags a listing)
// ─────────────────────────────────────────────────────────────────

const REPORT_REASONS = ['Fake/counterfeit item', 'Misleading description', 'Wrong category', 'Spam or inappropriate', 'Price gouging'];

export function ReportProductButton({ productId, T, onReport }: {
  productId: string; T: Tokens;
  onReport?: (productId: string, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const report = (reason: string) => {
    onReport?.(productId, reason);
    setDone(true); setOpen(false);
    setTimeout(() => setDone(false), 4000);
  };

  if (done) return <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', color: T.inkL }}>✓ Report submitted</p>;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: T.inkL, fontFamily: '"Inter",sans-serif', fontSize: '0.72rem', padding: '4px 8px' }}>
        <Flag size={12}/> Report
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setOpen(false)}/>
            <motion.div initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }}
              style={{ position: 'absolute', bottom: '110%', right: 0, zIndex: 201, background: T.white, borderRadius: 12, padding: 12, width: 220, boxShadow: `0 8px 32px ${T.shadowM}`, border: `1px solid ${T.line}` }}>
              <p style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.68rem', fontWeight: 600, color: T.inkL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Report reason</p>
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => report(r)}
                  style={{ width: '100%', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', color: T.inkM, borderRadius: 6, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = T.paper}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}>
                  {r}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SELLER PUBLIC PROFILE PAGE
// ─────────────────────────────────────────────────────────────────

/**
 * @example
 * {view === 'seller' && <SellerProfilePage sellerId={selSellerId} products={products} T={T} onProduct={goToProduct} onAddToCart={addToCart}/>}
 */
export function SellerProfilePage({ sellerId, sellerName, products, T, onProduct, onAddToCart }: {
  sellerId: string; sellerName: string; products: any[];
  T: Tokens; onProduct: (p: any) => void; onAddToCart: (p: any) => void;
}) {
  const sellerProducts = products.filter(p => p.sellerId === sellerId);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ background: `linear-gradient(135deg, ${T.forest} 0%, #1a3320 100%)`, borderRadius: 20, padding: '32px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
            <span style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>{sellerName?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{sellerName}</h1>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{sellerProducts.length} products</span>
              <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>⭐ Verified Artisan</span>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: '1.1rem', fontWeight: 700, color: T.ink, marginBottom: 16 }}>All Listings by {sellerName}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
        {sellerProducts.map(p => (
          <div key={p.id} onClick={() => onProduct(p)} style={{ background: T.white, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${T.line}`, boxShadow: `0 2px 10px ${T.shadow}` }}>
            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}/>
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: '0.85rem', color: T.ink, margin: '0 0 6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: '"Inter",sans-serif', fontSize: '0.9rem', fontWeight: 700, color: T.ink }}>₹{p.price}</span>
                <button onClick={e => { e.stopPropagation(); onAddToCart(p); }} style={{ padding: '5px 10px', background: T.forest, color: '#fff', border: 'none', borderRadius: 6, fontFamily: '"Inter",sans-serif', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}