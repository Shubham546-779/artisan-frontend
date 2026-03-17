import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ── Token Store ──────────────────────────────────────────
export const tokenStore = {
  get: (): string | null => localStorage.getItem('ab_token'),
  set: (t: string): void => { localStorage.setItem('ab_token', t); },
  remove: (): void => { localStorage.removeItem('ab_token'); },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── API ──────────────────────────────────────────────────
export const api = {
  auth: {
    register: async (data: {
      name: string; email: string; password: string;
      role: 'buyer' | 'seller'; shopName?: string;
    }) => {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.name });
      await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        shopName: data.shopName || null,
        memberSince: new Date().toISOString(),
        verified: false,
        salesCount: 0,
        reviewCount: 0,
        rating: 0,
      });
      const token = await cred.user.getIdToken();
      tokenStore.set(token);
      return {
        token,
        user: {
          id: cred.user.uid,
          name: data.name,
          email: data.email,
          role: data.role,
          shopName: data.shopName,
          memberSince: new Date().toISOString(),
          verified: false,
          salesCount: 0,
          reviewCount: 0,
          rating: 0,
        }
      };
    },

    login: async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      const userData = userDoc.data();
      const token = await cred.user.getIdToken();
      tokenStore.set(token);
      return { token, user: { id: cred.user.uid, ...userData } };
    },

    logout: () => {
      signOut(auth);
      tokenStore.remove();
    },

    me: async () => {
      const user = auth.currentUser;
      if (!user) throw new ApiError(401, 'Not logged in');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      return { id: user.uid, ...userDoc.data() };
    },

    updateProfile: async (data: object) => {
      const user = auth.currentUser;
      if (!user) throw new ApiError(401, 'Not logged in');
      await updateDoc(doc(db, 'users', user.uid), data);
      return data;
    },
  },

  products: {
    list: async (params?: {
      search?: string; category?: string;
      sort?: string; page?: number; limit?: number;
    }) => {
      let q = query(collection(db, 'products'), limit(params?.limit || 60));
      if (params?.category) {
        q = query(collection(db, 'products'),
          where('category', '==', params.category), limit(params?.limit || 60));
      }
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      if (params?.search) {
        const s = params.search.toLowerCase();
        data = data.filter(p =>
          p.name.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s)
        );
      }
      return { data, total: data.length, page: 1, pages: 1, limit: 60 };
    },

    get: async (id: string) => {
      const snap = await getDoc(doc(db, 'products', id));
      if (!snap.exists()) throw new ApiError(404, 'Product not found');
      const related = await getDocs(query(
        collection(db, 'products'),
        where('category', '==', snap.data().category),
        limit(4)
      ));
      return {
        id: snap.id,
        ...snap.data(),
        related: related.docs
          .filter(d => d.id !== id)
          .map(d => ({ id: d.id, ...d.data() }))
          .slice(0, 3),
        seller: null,
      };
    },

    create: async (data: object) => {
      const user = auth.currentUser;
      if (!user) throw new ApiError(401, 'Not logged in');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const ref = await addDoc(collection(db, 'products'), {
        ...data,
        sellerId: user.uid,
        sellerName: userData?.shopName || userData?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: 0,
        likeCount: 0,
        rating: 0,
        reviewCount: 0,
        featured: false,
        deletedAt: null,
        imageUrls: [(data as any).imageUrl],
        stock: 10,
        tags: [],
      });
      return { id: ref.id, ...data };
    },

    update: async (id: string, data: object) => {
      await updateDoc(doc(db, 'products', id), data);
      return { id, ...data };
    },

    delete: async (id: string) => {
      await deleteDoc(doc(db, 'products', id));
    },

    bySeller: async (sellerId: string) => {
      const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { data, total: data.length };
    },
  },

  reviews: {
    forProduct: async (productId: string) => {
      const q = query(collection(db, 'reviews'), where('productId', '==', productId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const avg = data.length > 0
        ? (data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1)
        : null;
      return { data, total: data.length, page: 1, pages: 1, limit: 20, avgRating: avg };
    },

    post: async (productId: string, rating: number, comment?: string) => {
      const user = auth.currentUser;
      if (!user) throw new ApiError(401, 'Not logged in');
      const ref = await addDoc(collection(db, 'reviews'), {
        productId, rating, comment,
        buyerId: user.uid,
        buyerName: user.displayName || 'Anonymous',
        createdAt: new Date().toISOString(),
      });
      return { id: ref.id, productId, rating, comment };
    },

    delete: async (id: string) => {
      await deleteDoc(doc(db, 'reviews', id));
    },
  },

  wishlist: {
    get: async () => {
      const user = auth.currentUser;
      if (!user) return { data: [], total: 0 };
      const q = query(collection(db, 'wishlist'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const productIds = snap.docs.map(d => d.data().productId);
      const products = await Promise.all(
        productIds.map(id => getDoc(doc(db, 'products', id)))
      );
      const data = products
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));
      return { data, total: data.length };
    },

    add: async (productId: string) => {
      const user = auth.currentUser;
      if (!user) throw new ApiError(401, 'Not logged in');
      await addDoc(collection(db, 'wishlist'), {
        userId: user.uid, productId,
        createdAt: new Date().toISOString(),
      });
      return { message: 'Added to wishlist' };
    },

    remove: async (productId: string) => {
      const user = auth.currentUser;
      if (!user) throw new ApiError(401, 'Not logged in');
      const q = query(collection(db, 'wishlist'),
        where('userId', '==', user.uid),
        where('productId', '==', productId));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      return { message: 'Removed from wishlist' };
    },
  },
};