import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, Product, CartItem, Order, B2BRequirement, ShippingAddress } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

interface AppContextType {
  // Auth & Roles
  currentUser: User;
  switchRole: (role: UserRole) => void;

  // Products
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;

  // Orders
  orders: Order[];
  createOrder: (shippingAddress: ShippingAddress, paymentMethod: 'upi' | 'card' | 'cod') => Order;

  // B2B
  b2bRequirements: B2BRequirement[];
  addB2BRequirement: (req: Omit<B2BRequirement, 'id' | 'createdAt' | 'proposalsCount' | 'status'>) => void;

  // Modals & Navigation Helpers
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (product: Product | null) => void;
}

const DEFAULT_USERS: Record<UserRole, User> = {
  artisan: {
    id: 'art-01',
    name: 'Rameshwar Lal Kumhar',
    email: 'rameshwar.pottery@kalaconnect.in',
    role: 'artisan',
    phone: '+91 98290 12345',
    location: 'Kot Jewar, Rajasthan',
    craftSpecialty: 'Master Terracotta & Blue Pottery',
    avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
  },
  customer: {
    id: 'cust-01',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@gmail.com',
    role: 'customer',
    phone: '+91 98450 67890',
    location: 'Bengaluru, Karnataka',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  b2b: {
    id: 'b2b-01',
    name: 'Vikram Mehra',
    email: 'vikram@heritageliving.com',
    role: 'b2b',
    businessName: 'Heritage Luxury Living & Resorts',
    phone: '+91 99100 88221',
    location: 'New Delhi',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  admin: {
    id: 'admin-01',
    name: 'Pooja Verma',
    email: 'admin@kalaconnect.ai',
    role: 'admin',
    location: 'Hyderabad, India',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
};

const INITIAL_B2B_REQUIREMENTS: B2BRequirement[] = [
  {
    id: 'b2b-req-1',
    buyerId: 'b2b-01',
    companyName: 'Heritage Luxury Living & Resorts',
    title: '500 Handcrafted Terracotta Water Jugs for Guest Suites',
    category: 'Pottery & Ceramics',
    quantityNeeded: 500,
    targetBudgetPerUnit: 650,
    targetDeliveryDate: '2026-11-15',
    description: 'We seek high-finish food-safe natural terracotta water bottles/jugs with customized brass caps for our luxury heritage property in Udaipur.',
    proposalsCount: 3,
    status: 'open',
    createdAt: '2026-08-25T12:00:00.000Z',
  },
  {
    id: 'b2b-req-2',
    buyerId: 'b2b-01',
    companyName: 'Conscious Craft Boutique, London',
    title: '250 Handwoven Pochampally Ikat Silk Scarves',
    category: 'Handloom & Textiles',
    quantityNeeded: 250,
    targetBudgetPerUnit: 1800,
    targetDeliveryDate: '2026-10-30',
    description: 'Export grade handloom silk stoles in natural indigo and madder root dyes. Required fair trade artisan traceability label.',
    proposalsCount: 5,
    status: 'matched',
    createdAt: '2026-08-28T09:30:00.000Z',
  },
];

const STORAGE_KEYS = {
  USER_ROLE: 'kalaconnect_user_role',
  PRODUCTS: 'kalaconnect_products',
  CART: 'kalaconnect_cart',
  ORDERS: 'kalaconnect_orders',
  B2B: 'kalaconnect_b2b_requirements',
};

const ROUTE_VIEW_MAP: Record<string, { view: string; role?: UserRole }> = {
  '/': { view: 'landing' },
  '/marketplace': { view: 'marketplace' },
  '/login': { view: 'login' },
  '/register': { view: 'login' },
  '/customer/dashboard': { view: 'customer-dashboard', role: 'customer' },
  '/artisan/dashboard': { view: 'artisan-dashboard', role: 'artisan' },
  '/b2b/dashboard': { view: 'b2b-dashboard', role: 'b2b' },
  '/admin/dashboard': { view: 'admin-dashboard', role: 'admin' },
  '/product-studio': { view: 'artisan-add-product', role: 'artisan' },
  '/how-it-works': { view: 'landing' },
};

const VIEW_ROUTE_MAP: Record<string, string> = {
  landing: '/',
  marketplace: '/marketplace',
  login: '/login',
  'customer-dashboard': '/customer/dashboard',
  'artisan-dashboard': '/artisan/dashboard',
  'b2b-dashboard': '/b2b/dashboard',
  'admin-dashboard': '/admin/dashboard',
  'artisan-add-product': '/product-studio',
  'how-it-works': '/how-it-works',
};

function getSubpathPrefix(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  for (const route of Object.keys(ROUTE_VIEW_MAP)) {
    if (route !== '/' && pathname.toLowerCase().includes(route.toLowerCase())) {
      const idx = pathname.toLowerCase().indexOf(route.toLowerCase());
      return pathname.slice(0, idx).replace(/\/$/, '');
    }
  }
  if (pathname !== '/' && !ROUTE_VIEW_MAP[pathname]) {
    return pathname.replace(/\/$/, '');
  }
  return '';
}

function getRouteInfo(): { view: string; role?: UserRole } {
  if (typeof window === 'undefined') return { view: 'landing' };

  // Support hash routing (e.g. #/marketplace)
  const hash = window.location.hash.replace(/^#/, '');
  let path = hash.startsWith('/') ? hash : window.location.pathname;

  // Clean trailing slashes
  path = path.replace(/\/$/, '') || '/';

  // 1. Direct route match
  if (ROUTE_VIEW_MAP[path]) {
    return ROUTE_VIEW_MAP[path];
  }

  // 2. Subpath deployment match (e.g. /handcraft/marketplace or /kalaconnect-ai/artisan/dashboard)
  for (const [route, info] of Object.entries(ROUTE_VIEW_MAP)) {
    if (route !== '/' && (path.endsWith(route) || path.toLowerCase().endsWith(route.toLowerCase()))) {
      return info;
    }
  }

  // 3. Query parameter routing fallback (e.g. ?view=marketplace or ?route=/artisan/dashboard)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const paramView = searchParams.get('view');
    if (paramView && VIEW_ROUTE_MAP[paramView]) {
      const targetRoute = VIEW_ROUTE_MAP[paramView];
      return { view: paramView, role: ROUTE_VIEW_MAP[targetRoute]?.role };
    }
    const paramRoute = searchParams.get('route');
    if (paramRoute) {
      const decoded = decodeURIComponent(paramRoute);
      const cleanRoute = decoded.replace(/\/$/, '') || '/';
      if (ROUTE_VIEW_MAP[cleanRoute]) {
        return ROUTE_VIEW_MAP[cleanRoute];
      }
      for (const [route, info] of Object.entries(ROUTE_VIEW_MAP)) {
        if (route !== '/' && (cleanRoute.endsWith(route) || cleanRoute.toLowerCase().endsWith(route.toLowerCase()))) {
          return info;
        }
      }
    }
  } catch {
    // Ignore search params parsing errors
  }

  return { view: 'landing' };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth Role State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const initialRoute = getRouteInfo();
      if (initialRoute.role && DEFAULT_USERS[initialRoute.role]) {
        return DEFAULT_USERS[initialRoute.role];
      }
      const savedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole | null;
      if (savedRole && DEFAULT_USERS[savedRole]) {
        return DEFAULT_USERS[savedRole];
      }
    } catch {
      // Safe fallback
    }
    return DEFAULT_USERS.artisan; // Default to artisan as the core creator
  });

  // Products State
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Safe fallback
    }
    return INITIAL_PRODUCTS;
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Safe fallback
    }
    return [];
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Safe fallback
    }
    // Realistic initial order for Rameshwar Kumhar to see orders right away
    return [
      {
        id: 'ORD-78219',
        customerId: 'cust-01',
        customerName: 'Ananya Sharma',
        artisanIds: ['art-01'],
        items: [
          {
            product: INITIAL_PRODUCTS[0],
            quantity: 1,
            price: INITIAL_PRODUCTS[0].price,
          },
        ],
        totalAmount: INITIAL_PRODUCTS[0].price,
        shippingAddress: {
          fullName: 'Ananya Sharma',
          phone: '+91 98450 67890',
          street: '42 Indiranagar, 12th Main',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
        },
        paymentMethod: 'upi',
        status: 'processing',
        createdAt: '2026-09-01T11:20:00.000Z',
      },
    ];
  });

  // B2B State
  const [b2bRequirements, setB2bRequirements] = useState<B2BRequirement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.B2B);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Safe fallback
    }
    return INITIAL_B2B_REQUIREMENTS;
  });

  // Navigation & UI States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeView, setActiveViewState] = useState<string>(() => getRouteInfo().view);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  const setActiveView = (view: string) => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      const subpath = getSubpathPrefix();
      const targetRoute = VIEW_ROUTE_MAP[view] || '/';
      const targetPath = subpath ? `${subpath}${targetRoute === '/' ? '/' : targetRoute}` : targetRoute;
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ view }, '', targetPath);
        } catch {
          // Ignore write errors
        }
      }
    }
  };

  // Sync route on popstate, hashchange, and initial mount
  useEffect(() => {
    const handlePopState = () => {
      const routeInfo = getRouteInfo();
      setActiveViewState(routeInfo.view);
      if (routeInfo.role) {
        const user = DEFAULT_USERS[routeInfo.role] || DEFAULT_USERS.artisan;
        setCurrentUser(user);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Clean up URL query parameter (?route=...) seamlessly on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const paramRoute = searchParams.get('route');
        const paramView = searchParams.get('view');
        let targetRoute = paramRoute ? decodeURIComponent(paramRoute) : (paramView ? VIEW_ROUTE_MAP[paramView] : null);
        if (targetRoute) {
          targetRoute = targetRoute.replace(/\/$/, '') || '/';
          if (ROUTE_VIEW_MAP[targetRoute]) {
            const subpath = getSubpathPrefix();
            const cleanPath = subpath ? `${subpath}${targetRoute === '/' ? '/' : targetRoute}` : targetRoute;
            window.history.replaceState({ view: ROUTE_VIEW_MAP[targetRoute].view }, '', cleanPath);
          }
        }
      } catch {
        // Ignore URL rewrite errors
      }
    }
  }, []);

  // Sync to LocalStorage defensively
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // Ignore write errors
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // Ignore write errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // Ignore write errors
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.B2B, JSON.stringify(b2bRequirements));
    } catch {
      // Ignore write errors
    }
  }, [b2bRequirements]);

  const switchRole = (role: UserRole) => {
    const user = DEFAULT_USERS[role] || DEFAULT_USERS.artisan;
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    } catch {
      // Ignore error
    }

    // Direct user to appropriate dashboard
    if (role === 'artisan') {
      setActiveView('artisan-dashboard');
    } else if (role === 'customer') {
      setActiveView('customer-dashboard');
    } else if (role === 'b2b') {
      setActiveView('b2b-dashboard');
    } else if (role === 'admin') {
      setActiveView('admin-dashboard');
    }
  };

  // Product Actions
  const addProduct = (newProduct: Product) => {
    if (!newProduct || !newProduct.id) return;
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    if (!id) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteProduct = (id: string) => {
    if (!id) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Cart Actions
  const addToCart = (product: Product, quantity = 1) => {
    if (!product || !product.id) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    if (!productId) return;
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (!productId) return;
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
  const cartTotal = cart.reduce(
    (total, item) => total + (item.product?.price || 0) * (item.quantity || 1),
    0
  );

  // Order Actions
  const createOrder = (
    shippingAddress: ShippingAddress,
    paymentMethod: 'upi' | 'card' | 'cod'
  ): Order => {
    const artisanIdSet = new Set<string>();
    cart.forEach((item) => {
      if (item.product?.artisanId) {
        artisanIdSet.add(item.product.artisanId);
      }
    });

    const newOrder: Order = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: currentUser.id,
      customerName: currentUser.name || 'Valued Customer',
      artisanIds: Array.from(artisanIdSet),
      items: cart.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalAmount: cartTotal,
      shippingAddress,
      paymentMethod,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  // B2B Actions
  const addB2BRequirement = (
    req: Omit<B2BRequirement, 'id' | 'createdAt' | 'proposalsCount' | 'status'>
  ) => {
    const newReq: B2BRequirement = {
      ...req,
      id: `b2b-req-${Date.now()}`,
      createdAt: new Date().toISOString(),
      proposalsCount: 0,
      status: 'open',
    };
    setB2bRequirements((prev) => [newReq, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        switchRole,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartTotal,
        orders,
        createOrder,
        b2bRequirements,
        addB2BRequirement,
        isCartOpen,
        setIsCartOpen,
        activeView,
        setActiveView,
        selectedProductForDetail,
        setSelectedProductForDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
