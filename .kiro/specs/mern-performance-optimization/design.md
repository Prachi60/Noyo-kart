# Design Document — MERN Performance Optimization

## Overview

This document describes the technical design for the 22-requirement performance optimization
initiative across the MERN-stack quick-commerce customer application. The work is organized into
four delivery phases that can be shipped independently:

- **Phase 1 – Quick Wins**: Compression, debouncing, lazy loading, memoization, TTL caching.
- **Phase 2 – Component Architecture**: CheckoutPage decomposition, animation pruning, context
  stability.
- **Phase 3 – Build & Bundle**: Vite chunk splitting, minification, icon library consolidation,
  dynamic Lottie imports.
- **Phase 4 – Backend**: Category-name caching, async request logger, CacheService extension.

### Goals

| Metric | Target |
|--------|--------|
| Initial JS bundle (main chunk) | < 500 KB uncompressed |
| API response size (gzip) | ≥ 60 % reduction on JSON payloads |
| `checkoutPreview` calls per checkout session | Reduced by debounce coalescence |
| `localStorage` writes per rapid cart update | 1 per 300 ms window |
| `getProducts` / `getMyOrders` / `getNearbySellers` cache hit rate | > 80 % in steady state |
| CheckoutPage re-render scope | Isolated to changed sub-component only |

---

## Architecture

### High-Level Change Map

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React App (Vite bundle)                                 │   │
│  │  ┌────────────────┐  ┌──────────────────────────────┐   │   │
│  │  │  CheckoutPage  │  │  Home / Other Pages          │   │   │
│  │  │  (8 sub-comps) │  │  (lazy Lottie, lazy images)  │   │   │
│  │  └───────┬────────┘  └──────────────────────────────┘   │   │
│  │          │ debounced 400ms                               │   │
│  │  ┌───────▼────────────────────────────────────────────┐ │   │
│  │  │  CartContext (useMemo, debounced localStorage 300ms)│ │   │
│  │  └───────────────────────────────────────────────────-─┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │ axios / socket.io                    │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Express 5 Backend                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  compression middleware (gzip, threshold 1024 B)         │   │
│  │  correlationIdMiddleware → structuredRequestLogger (async)│   │
│  │  routes → controllers                                    │   │
│  │    productController  ──► CacheService (Redis)           │   │
│  │    orderController    ──► CacheService (Redis)           │   │
│  │    sellerController   ──► CacheService (Redis)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │  MongoDB / Redis                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow — Debounced checkoutPreview

```
User changes cart/payment/tip/address
        │
        ▼
  clearTimeout(debounceRef)
  debounceRef = setTimeout(fetchPreview, 400)
        │
        │  400 ms of silence
        ▼
  fetchPreview() ──► POST /orders/checkout/preview
        │
        ▼
  setPricingPreview(breakdown)
        │
        ▼
  <CheckoutPricingBreakdown> re-renders (only this sub-component)
```

### Data Flow — TTL Cache (cache-aside)

```
Controller receives request
        │
        ▼
  buildKey(service, entity, id)
        │
        ▼
  getOrSet(key, fetchFn, TTL)
        │
        ├── Redis HIT ──► return cached JSON  ──► incrementCounter(cache_hit_total)
        │
        └── Redis MISS ──► fetchFn() (MongoDB)
                        ──► set(key, value, TTL)
                        ──► incrementCounter(cache_miss_total)
                        ──► return value
```

---

## Components and Interfaces

### Phase 1 — Quick Wins

#### 1. Gzip Compression (`backend/index.js`)

Install `compression` package and register before all routes:

```js
import compression from "compression";

app.use(compression({
  threshold: 1024,          // bytes — bodies ≤ 1024 B sent uncompressed
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));
// Must appear before app.use(cors(...)), helmet(), routes, etc.
```

The `compression` package respects `Accept-Encoding` automatically; no manual header logic needed.

#### 2. Debounced `checkoutPreview` (`CheckoutPage.jsx`)

Replace the current `useEffect` that fires on every dependency change with a debounced version:

```js
const previewDebounceRef = useRef(null);

useEffect(() => {
  if (!isAuthenticated || cart.length === 0) {
    setPricingPreview(null);
    return;
  }

  clearTimeout(previewDebounceRef.current);
  previewDebounceRef.current = setTimeout(async () => {
    try {
      setIsPreviewLoading(true);
      const res = await customerApi.checkoutPreview(buildPreviewPayload());
      if (res.data?.success) {
        setPricingPreview(res.data.result?.breakdown ?? null);
      }
    } catch (err) {
      console.error("Checkout preview failed", err);
    } finally {
      setIsPreviewLoading(false);
    }
  }, 400);

  return () => clearTimeout(previewDebounceRef.current);
}, [
  isAuthenticated, cart, selectedPayment, selectedTip,
  selectedTimeSlot, discountAmount, savedRecipient,
  currentAddress, currentLocation,
]);
```

The `buildPreviewPayload()` helper extracts the payload construction so the effect body stays lean.

#### 3. Debounced `localStorage` Writes (`CartContext.jsx`)

Replace the current eager `useEffect` with a debounced write:

```js
const lsDebounceRef = useRef(null);

useEffect(() => {
  if (isAuthenticated) return;           // backend is source of truth

  clearTimeout(lsDebounceRef.current);
  lsDebounceRef.current = setTimeout(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, 300);

  return () => {
    // Flush on unmount — no data loss
    clearTimeout(lsDebounceRef.current);
    localStorage.setItem("cart", JSON.stringify(cart));
  };
}, [cart, isAuthenticated]);
```

#### 4. Lazy-load Wishlist via IntersectionObserver (`CheckoutPage.jsx`)

```js
const wishlistSectionRef = useRef(null);
const wishlistFetchedRef = useRef(false);

useEffect(() => {
  if (!isAuthenticated) return;
  if (!("IntersectionObserver" in window)) {
    // Fallback for unsupported browsers
    if (!wishlistFetchedRef.current) {
      wishlistFetchedRef.current = true;
      fetchFullWishlist();
    }
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !wishlistFetchedRef.current) {
        wishlistFetchedRef.current = true;
        fetchFullWishlist();
        observer.disconnect();
      }
    },
    { rootMargin: "200px" }
  );

  if (wishlistSectionRef.current) observer.observe(wishlistSectionRef.current);
  return () => observer.disconnect();
}, [isAuthenticated]);
```

Attach `ref={wishlistSectionRef}` to the wishlist section container.

#### 5. Stable Recommended Products Dependency (`CheckoutPage.jsx`)

Derive a stable `cartProductIdKey` that only changes when the set of IDs changes:

```js
const cartProductIdKey = useMemo(
  () =>
    cart
      .map((i) => i.id || i._id)
      .sort()
      .join(","),
  [cart]
);

useEffect(() => {
  if (cart.length === 0) {
    setRecommendedProducts([]);
    return;
  }
  const categoryId = cart[0]?.categoryId?._id || cart[0]?.categoryId;
  if (!categoryId) return;

  const cartIds = new Set(cart.map((i) => i.id || i._id));
  customerApi
    .getProducts({ categoryId, limit: 10 })
    .then((res) => {
      if (res.data?.success) {
        const items = (res.data.result?.items || [])
          .map((p) => ({ ...p, id: p._id }))
          .filter((p) => !cartIds.has(p.id));
        setRecommendedProducts(items.slice(0, 8));
      }
    })
    .catch(() => {});
}, [cartProductIdKey]);   // ← only fires when IDs change, not quantities
```

#### 6. Pure WebSocket After Order Placement (`CheckoutPage.jsx`)

Remove the `setInterval` polling loop. Use only the WebSocket listener with a single fallback
call when the socket is not yet connected:

```js
useEffect(() => {
  if (!orderId || !showSuccess) return;

  const getToken = () => { /* existing token helper */ };
  getOrderSocket(getToken);
  joinOrderRoom(orderId, getToken);

  const applyCancelled = (order) => {
    if (order.workflowStatus === "CANCELLED" || order.status === "cancelled") {
      clearTimeout(postOrderNavigateRef.current);
      setShowSuccess(false);
      showToast("Order cancelled — seller did not accept in time.", "error");
      navigate(`/orders/${orderId}`, { replace: true });
      return true;
    }
    return false;
  };

  // Single immediate check (covers WebSocket-unavailable case)
  customerApi.getOrderDetails(orderId)
    .then((r) => { if (r.data?.result) applyCancelled(r.data.result); })
    .catch(() => {});

  const off = onOrderStatusUpdate(getToken, (order) => applyCancelled(order));

  return () => {
    off();
    leaveOrderRoom(orderId, getToken);
  };
}, [orderId, showSuccess]);
```

If the WebSocket is unavailable, the socket library will reconnect automatically; the single
immediate `getOrderDetails` call covers the gap.

#### 7. `React.memo` on `ProductCard`

```js
// frontend/src/modules/customer/components/shared/ProductCard.jsx

const ProductCard = ({ product, onAddToCart, onRemoveFromCart, cartItem, /* … */ }) => {
  // … existing render logic …
};

export default React.memo(ProductCard);
```

For object props that need deep comparison, callers can pass a stable reference via `useMemo` or
`useCallback`. The component itself does not need a custom `areEqual` unless profiling shows it
is necessary.

#### 8. `loading="lazy"` + Cloudinary Transforms

Create a shared utility:

```js
// frontend/src/core/utils/imageUtils.js

const CLOUDINARY_REGEX = /res\.cloudinary\.com/i;

/**
 * Appends Cloudinary optimisation transforms to a URL.
 * Safe to call on any URL — non-Cloudinary URLs are returned unchanged.
 */
export function applyCloudinaryTransform(url, params = "w=300,f_webp,q_auto") {
  if (!url || !CLOUDINARY_REGEX.test(url)) return url;
  // Insert transform before /upload/ path segment
  return url.replace(/\/upload\//, `/upload/${params}/`);
}
```

Usage in `ProductCard`:

```jsx
<img
  src={applyCloudinaryTransform(product.image)}
  alt={product.name}
  loading="lazy"
  width={300}
  height={300}
/>
```

The LCP hero image (first above-the-fold banner) should use `loading="eager"` (the default) and
omit the transform width restriction so it renders at full resolution.

#### 9–11. TTL Caching — `getMyOrders`, `getNearbySellers`, `getProducts`

**CacheService extension** (`backend/app/services/cacheService.js`):

Add new TTL types to `TTL_CONFIG`:

```js
const TTL_CONFIG = {
  // … existing entries …
  orders:         parseInt(process.env.CACHE_ORDERS_TTL          || "60",  10),
  nearbySellers:  parseInt(process.env.CACHE_NEARBY_SELLERS_TTL  || "300", 10),
  productList:    parseInt(process.env.CACHE_PRODUCT_LIST_TTL    || "300", 10),
  categoryName:   parseInt(process.env.CACHE_CATEGORY_NAME_TTL   || "3600",10),
};
```

**`getMyOrders` controller** (`backend/app/controller/orderController.js`):

```js
export const getMyOrders = async (req, res) => {
  const customerId = req.user.id;
  const key = buildKey("orders", "customer", customerId);

  const orders = await getOrSet(
    key,
    () => Order.find({ customerId }).sort({ createdAt: -1 }).lean(),
    getTTL("orders"),
  );

  return handleResponse(res, 200, "Orders fetched", orders);
};
```

Invalidate on order mutation:

```js
await invalidate(buildKey("orders", "customer", customerId));
```

**`getNearbySellers` cache key** (`backend/app/services/customerVisibilityService.js`):

```js
function buildNearbySellersKey(lat, lng) {
  const rLat = Number(lat).toFixed(4);
  const rLng = Number(lng).toFixed(4);
  return buildKey("sellers", "nearby", `${rLat}:${rLng}`);
}
```

**`getProducts` cache key** (`backend/app/controller/productController.js`):

```js
function buildProductListKey(queryParams) {
  // Deterministic: sort keys, normalise values
  const sorted = Object.keys(queryParams)
    .sort()
    .reduce((acc, k) => {
      acc[k] = String(queryParams[k] ?? "").trim().toLowerCase();
      return acc;
    }, {});
  return buildKey("catalog", "productList", JSON.stringify(sorted));
}
```

Only cache for customer/public requests (not admin/seller):

```js
const role = String(req.user?.role || "").toLowerCase();
const shouldCache = !role || (role !== "admin" && role !== "seller");
if (shouldCache) {
  return getOrSet(cacheKey, fetchFn, getTTL("productList"));
}
return fetchFn();
```

---

### Phase 2 — Component Architecture

#### 12. CheckoutPage Decomposition

The 2 015-line `CheckoutPage.jsx` is split into 8 focused sub-components. The parent retains all
state and passes only the props each child needs.

**File structure:**

```
frontend/src/modules/customer/pages/checkout/
  CheckoutPage.jsx                  ← orchestrator, holds all state
  components/
    CheckoutAddressSection.jsx
    CheckoutCartSummary.jsx
    CheckoutPricingBreakdown.jsx
    CheckoutPaymentSelector.jsx
    CheckoutCouponSection.jsx
    CheckoutRecommendedProducts.jsx
    CheckoutWishlistSection.jsx
    CheckoutOrderSuccess.jsx
```

**Component interface summary:**

| Sub-component | Key props received |
|---|---|
| `CheckoutAddressSection` | `currentAddress`, `savedRecipient`, `savedAddresses`, `onSelectAddress`, `onEditAddress`, `onUseCurrentLocation` |
| `CheckoutCartSummary` | `cart`, `onUpdateQuantity`, `onRemoveFromCart`, `onMoveToWishlist`, `showAll`, `onToggleShowAll` |
| `CheckoutPricingBreakdown` | `pricingPreview`, `isPreviewLoading`, `selectedTip`, `onSelectTip`, `tipAmounts`, `walletAmountToUse`, `finalAmountToPay` |
| `CheckoutPaymentSelector` | `paymentMethods`, `selectedPayment`, `onSelectPayment`, `useWallet`, `onToggleWallet`, `walletBalance` |
| `CheckoutCouponSection` | `coupons`, `selectedCoupon`, `manualCode`, `onApplyCoupon`, `onRemoveCoupon`, `onManualCodeChange` |
| `CheckoutRecommendedProducts` | `products`, `cart`, `onAddToCart`, `onGetCartItem` |
| `CheckoutWishlistSection` | `wishlist`, `sectionRef` (for IntersectionObserver) |
| `CheckoutOrderSuccess` | `orderId`, `show` |

All sub-components are wrapped in `React.memo`. `CheckoutPricingBreakdown` and
`CheckoutCartSummary` are the only ones that depend on `pricingPreview` and `cart` respectively,
so a pricing update only re-renders those two.

**Re-render isolation diagram:**

```
CheckoutPage (state owner)
  │
  ├── CheckoutAddressSection   ← re-renders on address change only
  ├── CheckoutCartSummary      ← re-renders on cart change
  ├── CheckoutPricingBreakdown ← re-renders on pricingPreview change
  ├── CheckoutPaymentSelector  ← re-renders on payment/wallet change
  ├── CheckoutCouponSection    ← re-renders on coupon change
  ├── CheckoutRecommendedProducts ← re-renders on cartProductIdKey change
  ├── CheckoutWishlistSection  ← re-renders on wishlist change
  └── CheckoutOrderSuccess     ← re-renders on orderId/showSuccess change
```

#### 13. Reduce Framer Motion `animate` on Lists

Replace per-item `motion.div` wrappers in product grids and cart lists with a single container
animation:

```jsx
// Before — animates every item individually
{products.map((p) => (
  <motion.div key={p.id} animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
    <ProductCard product={p} />
  </motion.div>
))}

// After — single container fade-in; items use CSS transition
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
  className="grid grid-cols-2 gap-3"
>
  {products.map((p) => (
    <div key={p.id} className="transition-opacity duration-200">
      <ProductCard product={p} />
    </div>
  ))}
</motion.div>
```

Retain `motion` only on: hero banners, modal overlays, page-level `AnimatePresence` transitions,
and the `SlideToPay` interactive element.

#### 14. Pause Off-Screen Particle Animations

Create a `useInViewAnimation` hook:

```js
// frontend/src/core/hooks/useInViewAnimation.js
import { useRef, useState, useEffect } from "react";

export function useInViewAnimation() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

Usage in particle containers:

```jsx
const { ref, isVisible } = useInViewAnimation();

<div ref={ref}>
  {particles.map((_, i) => (
    <motion.div
      key={i}
      animate={isVisible ? { y: [0, -20, 0], opacity: [0.4, 1, 0.4] } : { y: 0, opacity: 0 }}
      transition={isVisible ? { duration: 3, repeat: Infinity } : { duration: 0 }}
    />
  ))}
</div>
```

#### 15. Stable Context Provider Values

All five providers already use `useMemo` in `CartContext`. Apply the same pattern to the others:

```js
// WishlistContext.jsx
const value = useMemo(() => ({
  wishlist,
  isFullDataFetched,
  addToWishlist,
  removeFromWishlist,
  fetchFullWishlist,
}), [wishlist, isFullDataFetched]);

// LocationContext.jsx
const value = useMemo(() => ({
  currentLocation,
  savedAddresses,
  updateLocation,
  refreshLocation,
  isFetchingLocation,
}), [currentLocation, savedAddresses, isFetchingLocation]);
```

`CartContext` already has `useMemo` wrapping `cartValue`; verify the dependency array includes
`cart`, `cartTotal`, `cartCount`, and `loading` (it currently does).

#### 16. Optimise `useTransform` Scroll Listeners (`Home.jsx`)

The current `Home.jsx` already uses exactly 4 `useTransform` calls (`opacity`, `y`, `scale`,
`pointerEvents`) — this meets the requirement. The optimisation is to guard them with an
IntersectionObserver so they are only active when the hero section is visible:

```js
const heroRef = useRef(null);
const [heroVisible, setHeroVisible] = useState(true);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => setHeroVisible(entry.isIntersecting),
    { rootMargin: "0px" }
  );
  if (heroRef.current) observer.observe(heroRef.current);
  return () => observer.disconnect();
}, []);

// Only subscribe to scroll when hero is visible
const opacity = useTransform(scrollY, heroVisible ? [0, 300] : [0, 0], [1, 0.6]);
const y       = useTransform(scrollY, heroVisible ? [0, 300] : [0, 0], [0, 80]);
```

Add `will-change: transform` via Tailwind `will-change-transform` class to the hero container.

---

### Phase 3 — Build & Bundle

#### 17. Vite `manualChunks` + Minification (`frontend/vite.config.js`)

```js
export default defineConfig({
  plugins: [react(), firebaseMessagingSwPlugin()],
  resolve: { alias: { /* existing aliases */ } },
  build: {
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("@mui/material") ||
              id.includes("@mui/icons-material") ||
              id.includes("@emotion/react") ||
              id.includes("@emotion/styled")
            ) return "vendor-mui";

            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("firebase"))      return "vendor-firebase";
            if (id.includes("recharts"))      return "vendor-charts";
          }
        },
      },
    },
  },
});
```

#### 18. Remove `react-icons`

1. Audit all `react-icons` imports in the customer module with:
   `grep -r "from 'react-icons'" frontend/src/modules/customer`
2. Replace each import with the equivalent `lucide-react` icon (or an MUI icon already imported
   in `Home.jsx` for icons that have no lucide equivalent).
3. Remove `react-icons` from `frontend/package.json` and run `npm install`.

Common substitutions:

| react-icons | lucide-react |
|---|---|
| `FiShoppingCart` | `ShoppingCart` |
| `FiHeart` | `Heart` |
| `FiSearch` | `Search` |
| `FiX` | `X` |
| `FiCheck` | `Check` |
| `FiChevronRight` | `ChevronRight` |

#### 19. Dynamic Lottie JSON Imports

Replace static imports with `React.lazy` + `Suspense` pattern:

```jsx
// Before
import emptyBoxAnimation from "../../../assets/lottie/Empty box.json";

// After — in CheckoutPage.jsx
const [emptyBoxData, setEmptyBoxData] = useState(null);

useEffect(() => {
  if (cart.length === 0) {
    import("../../../assets/lottie/Empty box.json")
      .then((mod) => setEmptyBoxData(mod.default))
      .catch(() => {});
  }
}, [cart.length === 0]);

// In render:
{emptyBoxData ? (
  <Lottie animationData={emptyBoxData} loop />
) : (
  <div className="w-56 h-56" /> // placeholder
)}
```

Apply the same pattern to `noServiceAnimation` in `Home.jsx` and any other static Lottie imports.

---

### Phase 4 — Backend

#### 20. Category Name Caching in `getProducts`

Replace the four `.populate()` calls with a cache-backed resolver:

```js
// backend/app/services/categoryNameCache.js

import { buildKey, getOrSet, getTTL, invalidate } from "./cacheService.js";
import Category from "../models/category.js";

export async function resolveCategoryName(categoryId) {
  if (!categoryId) return null;
  const id = String(categoryId);
  const key = buildKey("catalog", "categoryName", id);

  return getOrSet(
    key,
    async () => {
      const cat = await Category.findById(id).select("name").lean();
      return cat?.name ?? null;
    },
    getTTL("categoryName"),
  );
}

export async function invalidateCategoryName(categoryId) {
  await invalidate(buildKey("catalog", "categoryName", String(categoryId)));
}
```

In `getProducts`, after the `Product.find()` query, resolve names in parallel:

```js
const products = await Product.find(query)
  .select("name slug price salePrice stock mainImage headerId categoryId subcategoryId sellerId …")
  // No .populate() calls — resolved below
  .sort(sortQuery).skip(skip).limit(limit).lean();

// Resolve all referenced IDs in parallel (cache-backed)
const allCategoryIds = [...new Set(products.flatMap((p) => [
  p.headerId, p.categoryId, p.subcategoryId, p.sellerId,
].filter(Boolean).map(String)))];

const nameMap = Object.fromEntries(
  await Promise.all(allCategoryIds.map(async (id) => [id, await resolveCategoryName(id)]))
);

const enriched = products.map((p) => ({
  ...p,
  headerId:      p.headerId      ? { _id: p.headerId,      name: nameMap[String(p.headerId)]      } : null,
  categoryId:    p.categoryId    ? { _id: p.categoryId,    name: nameMap[String(p.categoryId)]    } : null,
  subcategoryId: p.subcategoryId ? { _id: p.subcategoryId, name: nameMap[String(p.subcategoryId)] } : null,
  sellerId:      p.sellerId      ? { _id: p.sellerId,      name: nameMap[String(p.sellerId)]      } : null,
}));
```

Fallback: if `resolveCategoryName` throws (Redis unavailable), the `getOrSet` function in
`CacheService` already falls back to the direct DB query — no additional try/catch needed here.

#### 21. Async `structuredRequestLogger`

The current implementation in `backend/app/middleware/requestLogger.js` already calls `next()`
synchronously and attaches all work to `res.on("finish", …)`. The only gap is error handling in
the finish callback:

```js
export function structuredRequestLogger(req, res, next) {
  const start = req.requestStartedAt || Date.now();

  res.on("finish", () => {
    try {
      if (!shouldLogRequest(req.path, req.method)) return;
      // … existing logging and metrics code …
    } catch (err) {
      // Catch errors in the finish handler to prevent process crash
      console.error("[RequestLogger] Error in finish handler:", err);
    }
  });

  next();   // ← already synchronous; no change needed here
}
```

The `start` time is already captured before `next()` via `req.requestStartedAt` set in
`correlationIdMiddleware`. This satisfies requirement 21.5.

#### 22. CacheService Extension

Add the new TTL types to `TTL_CONFIG` (shown in §9–11 above) and ensure `getTTL` returns them:

```js
export function getTTL(type) {
  return TTL_CONFIG[type] ?? 300;
}
```

The existing `incrementCounter("cache_hit_total", …)` and `incrementCounter("cache_miss_total", …)`
calls in `get()` already emit Prometheus metrics for all keys, including the new ones. No
additional instrumentation is needed.

---

## Data Models

No new database collections are introduced. The changes affect only:

1. **Redis key namespace** — new key patterns:
   - `cache:{version}:orders:customer:{customerId}` — TTL 60 s
   - `cache:{version}:sellers:nearby:{lat4}:{lng4}` — TTL 300 s
   - `cache:{version}:catalog:productList:{jsonParams}` — TTL 300 s
   - `cache:{version}:catalog:categoryName:{categoryId}` — TTL 3 600 s

2. **Vite build output** — new chunk files:
   - `vendor-mui.[hash].js`
   - `vendor-motion.[hash].js`
   - `vendor-firebase.[hash].js`
   - `vendor-charts.[hash].js`

3. **Frontend file structure** — new checkout sub-component files (see §12).

---

