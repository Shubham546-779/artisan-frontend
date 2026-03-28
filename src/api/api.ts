/// <reference types="vite/client" />

const BASE_URL: string = 'https://artisan-backend-dy37.onrender.com/api';
export const tokenStore = {
  get:    (): string | null => localStorage.getItem('ab_token'),
  set:    (t: string): void => { localStorage.setItem('ab_token', t); },
  remove: (): void => { localStorage.removeItem('ab_token'); },
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export { ApiError };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth: boolean = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data['error'] === 'string' ? data['error'] : 'Request failed';
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

const get  = <T>(path: string, auth: boolean = false): Promise<T> =>
  request<T>('GET', path, undefined, auth);
const post = <T>(path: string, body: unknown, auth: boolean = false): Promise<T> =>
  request<T>('POST', path, body, auth);
const put  = <T>(path: string, body: unknown, auth: boolean = true): Promise<T> =>
  request<T>('PUT', path, body, auth);
const del  = <T>(path: string, auth: boolean = true): Promise<T> =>
  request<T>('DELETE', path, undefined, auth);

export type Role     = 'buyer' | 'seller';
export type Category = 'Jewelry' | 'Home Decor' | 'Clothing' | 'Art' | 'Toys' | 'Gifts' | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  shopName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  memberSince: string;
  verified: boolean;
  salesCount: number;
  reviewCount: number;
  rating: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  imageUrls?: string[];
  sellerId: string;
  sellerName: string;
  stock?: number;
  tags?: string[];
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  seller?: User;
  related?: Product[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ReviewsResponse extends Paginated<Review> {
  avgRating: string | null;
}

export interface ProductDetail extends Product {
  seller: User;
  related: Product[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const api = {
  auth: {
    register: (data: {
      name: string;
      email: string;
      password: string;
      role: Role;
      shopName?: string;
    }): Promise<AuthResponse> =>
      post<AuthResponse>('/auth/register', data, false).then((res) => {
        tokenStore.set(res.token);
        return res;
      }),

    login: (email: string, password: string): Promise<AuthResponse> =>
      post<AuthResponse>('/auth/login', { email, password }, false).then((res) => {
        tokenStore.set(res.token);
        return res;
      }),

    logout: (): void => { tokenStore.remove(); },

    me: (): Promise<User> => get<User>('/auth/me', true),

    // ✅ Fixed: saves new token returned after role update
    updateProfile: (data: Partial<User>): Promise<User> =>
      put<User & { token?: string }>('/auth/me', data, true).then((res) => {
        if (res.token) tokenStore.set(res.token);
        return res;
      }),
  },  // ✅ auth closing brace was missing — this was the syntax bug

  products: {
    list: (params?: {
      search?: string;
      category?: string;
      sort?: string;
      page?: number;
      limit?: number;
    }): Promise<Paginated<Product>> => {
      const entries = Object.entries(params ?? {}).filter(
        (pair): pair is [string, string | number] => pair[1] !== undefined,
      );
      const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
      return get<Paginated<Product>>(`/products${qs ? '?' + qs : ''}`);
    },

    get:  (id: string): Promise<ProductDetail> =>
      get<ProductDetail>(`/products/${id}`),

    create: (data: Partial<Product>): Promise<Product> =>
      post<Product>('/products', data, true),

    update: (id: string, data: Partial<Product>): Promise<Product> =>
      put<Product>(`/products/${id}`, data, true),

    delete: (id: string): Promise<void> => del<void>(`/products/${id}`),

    bySeller: (sellerId: string): Promise<{ data: Product[]; total: number }> =>
      get<{ data: Product[]; total: number }>(`/products/seller/${sellerId}`),
  },

  reviews: {
    forProduct: (productId: string, page: number = 1): Promise<ReviewsResponse> =>
      get<ReviewsResponse>(`/reviews/product/${productId}?page=${page}`),

    post: (productId: string, rating: number, comment?: string): Promise<Review> =>
      post<Review>(`/reviews/product/${productId}`, { rating, comment }, true),

    delete: (id: string): Promise<void> => del<void>(`/reviews/${id}`),
  },

  wishlist: {
    get: (): Promise<{ data: Product[]; total: number }> =>
      get<{ data: Product[]; total: number }>('/wishlist', true),

    add: (productId: string): Promise<{ message: string }> =>
      post<{ message: string }>(`/wishlist/${productId}`, {}, true),

    remove: (productId: string): Promise<{ message: string }> =>
      del<{ message: string }>(`/wishlist/${productId}`),
  },
};