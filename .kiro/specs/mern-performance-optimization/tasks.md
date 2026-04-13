# Implementation Plan: MERN Performance Optimization

## Overview

Four-phase performance optimization across the MERN-stack quick-commerce customer application.
Each phase is independently shippable. Tasks are ordered so each step builds on the previous one
and all code is wired together before the phase ends.

---

## Phase 1 — Quick Wins

- [x] 1. Add gzip compression middleware to Express backend
  - Install the `compression` npm package: `npm install compression` in `backend/`
  - Import `compression` in `backend/index.js`
  - Register `app.use(compression({ threshold: 1024, filter: ... }))` as the **first** middleware
    in `createApp()`, before `correlationIdMiddleware`, `helmet`, `cors`, and all routes
  - Verify the `filter` callback delegates to `compression.filter` and honours `x-no-compression`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Debounce `checkoutPreview` API calls in `CheckoutPage.jsx`
  - [x] 2.1 Replace the eager `checkoutPreview` `useEffect` with a debounced version
    - Add `const previewDebounceRef = useRef(null)` near the other refs
    - Extract a `buildPreviewPayload()` helper that assembles the POST body from current state
    - Replace the existing `useEffect` body with `clearTimeout` + `setTimeout(fetchPreview, 400)`
    - Return `() => clearTimeout(previewDebounceRef.current)` as the cleanup
    - Guard: skip the API call when `!isAuthenticated || cart.length === 0`
    - Keep the same dependency array: `[isAuthenticated, cart, selectedPayment, selectedTip,
      selectedTimeSlot, discountAmount, savedRecipient, currentAddress, currentLocation]`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Write property test for debounce coalescence (Req 2)
    - **Property 1: Debounce coalescence** — for any sequence of N ≥ 2 state changes all
      occurring within a 400 ms window, the number of `checkoutPreview` calls equals 1
    - **Property 2: Debounce delay** — for any single state change, the `checkoutPreview` call
      is made no earlier than 400 ms after the change
    - Use `fast-check` with fake timers (Jest `useFakeTimers`) to drive arbitrary sequences of
      rapid state changes and assert call counts via a `jest.fn()` spy on `customerApi.checkoutPreview`
    - File: `frontend/src/__tests__/debounce/checkoutPreviewDebounce.property.test.js`
    - _Requirements: 2.2_

- [x] 3. Debounce `localStorage` writes in `CartContext.jsx`
  - [x] 3.1 Replace the eager `localStorage.setItem` `useEffect` with a debounced write
    - Add `const lsDebounceRef = useRef(null)` inside `CartProvider`
    - Guard: return early when `isAuthenticated` is true (backend is source of truth) — this
      guard must appear at the very top of the effect body AND in the cleanup function
    - Replace the existing `useEffect` body with `clearTimeout` + `setTimeout(write, 300)`
    - In the cleanup function: first check `if (isAuthenticated) return` — only then call
      `clearTimeout(lsDebounceRef.current)` followed by the immediate flush
      `localStorage.setItem("cart", JSON.stringify(cart))` to prevent data loss on unmount
    - **Safety:** the flush-on-unmount must never run for authenticated users — writing a
      potentially stale or empty cart to localStorage when the backend is the source of truth
      would cause the guest cart to be corrupted on next logout
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Write property test for localStorage write coalescence (Req 3)
    - **Property 3: Write coalescence** — for any sequence of N ≥ 2 cart changes all occurring
      within a 300 ms window, `localStorage.setItem` is called exactly once
    - **Property 4: No data loss on unmount** — after unmount with a pending write, the value
      stored in `localStorage` equals the last cart state before unmount
    - Use `fast-check` with fake timers; spy on `localStorage.setItem`
    - File: `frontend/src/__tests__/debounce/cartLocalStorageDebounce.property.test.js`
    - _Requirements: 3.2, 3.3_

- [x] 4. Lazy-load wishlist via `IntersectionObserver` in `CheckoutPage.jsx`
  - Remove the existing `useEffect` that calls `fetchFullWishlist` on mount
    (`if (isAuthenticated && !isFullDataFetched) { fetchFullWishlist(); }`)
  - Add `const wishlistSectionRef = useRef(null)` and `const wishlistFetchedRef = useRef(false)`
  - Add a new `useEffect` that creates an `IntersectionObserver` with `rootMargin: "200px"`;
    on intersection, set `wishlistFetchedRef.current = true`, call `fetchFullWishlist()`, and
    disconnect the observer
  - Add `IntersectionObserver` unsupported browser fallback: call `fetchFullWishlist()` on mount
  - Attach `ref={wishlistSectionRef}` to the wishlist section container element in the JSX
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Fix recommended products `useEffect` dependency in `CheckoutPage.jsx`
  - Add a `cartProductIdKey` memo:
    ```js
    const cartProductIdKey = useMemo(
      () => cart.map((i) => i.id || i._id).sort().join(","),
      [cart]
    );
    ```
  - Change the existing recommended-products `useEffect` dependency from `[cart]` to
    `[cartProductIdKey]`
  - Add guard: `if (cart.length === 0) { setRecommendedProducts([]); return; }`
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Replace `setInterval` polling with pure WebSocket after order placement in `CheckoutPage.jsx`
  - In the post-order `useEffect` (the one that depends on `[orderId, showSuccess, ...]`):
    - Remove `pollId = setInterval(tick, 4000)` and the `clearInterval(pollId)` cleanup
    - Keep the single immediate `tick()` call as a one-shot fallback for when the socket is not
      yet connected
    - Change `onOrderStatusUpdate` callback from `tick` to `(order) => applyCancelled(order)` so
      the WebSocket delivers the full order object directly
    - Keep `leaveOrderRoom` in the cleanup
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Wrap `ProductCard` in `React.memo`
  - Open `frontend/src/modules/customer/components/shared/ProductCard.jsx`
  - Change the default export from `export default ProductCard` to
    `export default React.memo(ProductCard)`
  - Ensure `React` is imported (it already is via JSX transform, but `React.memo` needs the
    namespace import)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Create `applyCloudinaryTransform` utility and apply lazy images across customer module
  - [x] 8.1 Create `frontend/src/core/utils/imageUtils.js`
    - Implement `applyCloudinaryTransform(url, params = "w_300,f_webp,q_auto")` that inserts
      the transform string after `/upload/` in Cloudinary URLs; returns `url` unchanged for
      non-Cloudinary URLs
    - Export the function as a named export
    - _Requirements: 8.2, 8.3_

  - [x] 8.2 Apply `loading="lazy"` and Cloudinary transforms to all `<img>` tags in the customer module
    - Import `applyCloudinaryTransform` in `ProductCard.jsx`; wrap the `image` prop before
      rendering; add `loading="lazy"` to the `<img>` tag
    - Audit all other `<img>` tags in `frontend/src/modules/customer/` (pages, components,
      context); add `loading="lazy"` and wrap `src` with `applyCloudinaryTransform` where the
      URL is dynamic
    - Skip `loading="lazy"` on the first above-the-fold hero banner image in `Home.jsx`
      (LCP candidate); leave it as `loading="eager"` (the default)
    - _Requirements: 8.1, 8.4_

- [x] 9. Add `orders` TTL caching to `getMyOrders` controller
  - [x] 9.1 Add `orders` TTL type to `TTL_CONFIG` in `backend/app/services/cacheService.js`
    - Add `orders: parseInt(process.env.CACHE_ORDERS_TTL || "60", 10)` to `TTL_CONFIG`
    - _Requirements: 22.1, 22.3_

  - [x] 9.2 Wrap `getMyOrders` with `getOrSet` in `backend/app/controller/orderController.js`
    - Add a new top-level import of `buildKey`, `getOrSet`, `getTTL`, `invalidate` from
      `../services/cacheService.js` — `orderController.js` does not currently import cacheService
      at all, so this is a fresh import line
    - Build a page-scoped cache key that includes pagination to prevent page 2 returning page 1
      data: `buildKey("orders", "customer", \`${customerId}:p${page}:l${limit}\`)`
    - Wrap the **full existing** `Promise.all([Order.find({ customer: customerId }).select(...).sort(...).skip(skip).limit(limit).populate("items.product", "name mainImage price salePrice").lean(), Order.countDocuments({ customer: customerId })])` block inside the `getOrSet` fetch function — do not simplify or remove any existing `.select()`, `.populate()`, `.sort()`, `.skip()`, or `.limit()` calls
    - Cache the full response payload `{ items: orders, page, limit, total, totalPages }`
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 9.3 Invalidate `getMyOrders` cache on order mutations
    - Because the cache key includes page and limit, use a wildcard pattern to invalidate all
      pages for a customer: `await invalidate(buildKey("orders", "customer", \`${customerId}:*\`))`
    - The `invalidate` function in `cacheService.js` already handles wildcard patterns via
      `delPattern` when the key contains `*` — no extra logic needed
    - In `placeOrder`: after `placeOrderAtomic` succeeds, call the wildcard invalidation for
      `customerId`
    - In `cancelOrder`: after `order.save()` succeeds, call the wildcard invalidation for
      `customerId`
    - In `updateOrderStatus`: after `order.save()` succeeds (for customer-visible status
      changes), call the wildcard invalidation for `order.customer.toString()`
    - _Requirements: 9.3_

  - [x] 9.4 Write property tests for `getMyOrders` cache (Req 9)
    - **Property 5: Round-trip** — for any customer ID, the value returned from cache equals
      the value that would be returned by a direct MongoDB query for the same customer
    - **Property 6: Isolation** — invalidating the cache for customer A does not affect the
      cached result for customer B
    - Use `fast-check` with an in-memory mock of `getOrSet`/`invalidate`; generate arbitrary
      customer IDs and order payloads
    - File: `backend/__tests__/cache/getMyOrdersCache.property.test.js`
    - _Requirements: 9.1, 9.4_

- [x] 10. Fix `getNearbySellers` cache key precision and TTL in `customerVisibilityService.js`
  - Update `buildNearbyCacheKey` to use `toFixed(4)` instead of `toFixed(3)` for both `lat`
    and `lng`; rename the function to `buildNearbySellersKey` to match the CacheService naming
    convention and update the one call site inside `getNearbySellerIdsForCustomer`
  - Replace the raw `redis.get` / `redis.set(..., "EX", NEARBY_CACHE_TTL_S)` calls with
    `getOrSet(buildNearbySellersKey(lat, lng), fetchFn, getTTL("nearbySellers"))` where
    `fetchFn` contains the existing `Seller.find(...)` + in-memory filter logic
  - Add `nearbySellers: parseInt(process.env.CACHE_NEARBY_SELLERS_TTL || "300", 10)` to
    `TTL_CONFIG` in `cacheService.js` (coordinate with tasks 9.1, 11.1, and 23)
  - Import `buildKey`, `getOrSet`, `getTTL` from `cacheService.js` in
    `customerVisibilityService.js`
  - Remove the `getRedisClient` import **only after** confirming it is no longer referenced
    anywhere else in `customerVisibilityService.js`; also remove the now-unused
    `NEARBY_CACHE_TTL_S` constant to avoid confusion with the new 300 s TTL
  - _Requirements: 10.1, 10.2, 10.3, 22.1, 22.3_

- [x] 11. Add `productList` TTL caching to `getProducts` controller
  - [x] 11.1 Add `productList` TTL type to `TTL_CONFIG` in `cacheService.js`
    - Add `productList: parseInt(process.env.CACHE_PRODUCT_LIST_TTL || "300", 10)` to
      `TTL_CONFIG` (coordinate with tasks 9.1 and 10)
    - _Requirements: 22.1, 22.3_

  - [x] 11.2 Implement deterministic cache key builder in `productController.js`
    - Add a `buildProductListKey(queryParams)` function that sorts query param keys, normalises
      values to lowercase trimmed strings, and returns `buildKey("catalog", "productList",
      JSON.stringify(sorted))`
    - _Requirements: 11.3_

  - [x] 11.3 Wrap `getProducts` fetch with `getOrSet` for customer/public requests
    - After building `query`, `sortQuery`, `page`/`limit`/`skip`, extract the DB fetch into a
      `fetchFn` closure
    - Determine `shouldCache`: `!role || (role !== "admin" && role !== "seller")`
    - If `shouldCache`, call `getOrSet(buildProductListKey(req.query), fetchFn, getTTL("productList"))`
    - Otherwise call `fetchFn()` directly
    - _Requirements: 11.1, 11.2, 11.5_

  - [x] 11.4 Invalidate `productList` cache on product mutations
    - In `createProduct`, `updateProduct`, and `deleteProduct` controllers: after the DB write,
      call `await invalidate(buildKey("catalog", "productList", "*"))` to clear all product-list
      cache entries via wildcard
    - `buildKey("catalog", "productList", "*")` produces the pattern
      `cache:catalog:productList:*` (or `cache:{version}:catalog:productList:*` when
      `CACHE_KEY_VERSION` is set); the `invalidate` function in `cacheService.js` detects the
      `*` and delegates to `delPattern` automatically — no extra logic needed
    - _Requirements: 11.4_

  - [x] 11.5 Write property tests for `getProducts` cache (Req 11)
    - **Property 7: Round-trip** — for any query parameter set, the cached product list equals
      the list returned by a direct MongoDB query with the same parameters
    - **Property 8: Determinism** — two calls with logically equivalent query parameters (same
      keys, same values, different insertion order) produce the same cache key
    - Use `fast-check` to generate arbitrary query param objects; assert key equality for
      permuted inputs; use an in-memory mock for the cache store
    - File: `backend/__tests__/cache/getProductsCache.property.test.js`
    - _Requirements: 11.3_

- [x] 12. Checkpoint — Phase 1 complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2 — Component Architecture

- [x] 13. Split `CheckoutPage.jsx` into 8 isolated sub-components
  - [x] 13.1 Create the checkout sub-component directory and scaffold all 8 files
    - Create `frontend/src/modules/customer/pages/checkout/components/` directory
    - Create one file per sub-component (empty `React.memo`-wrapped shells):
      `CheckoutAddressSection.jsx`, `CheckoutCartSummary.jsx`,
      `CheckoutPricingBreakdown.jsx`, `CheckoutPaymentSelector.jsx`,
      `CheckoutCouponSection.jsx`, `CheckoutRecommendedProducts.jsx`,
      `CheckoutWishlistSection.jsx`, `CheckoutOrderSuccess.jsx`
    - _Requirements: 12.1_

  - [x] 13.2 Implement each sub-component with its minimal required props
    - `CheckoutAddressSection`: receives `currentAddress`, `savedRecipient`, `savedAddresses`,
      `onSelectAddress`, `onEditAddress`, `onUseCurrentLocation`; renders the address card and
      edit/select controls
    - `CheckoutCartSummary`: receives `cart`, `onUpdateQuantity`, `onRemoveFromCart`,
      `onMoveToWishlist`, `showAll`, `onToggleShowAll`; renders cart item list
    - `CheckoutPricingBreakdown`: receives `pricingPreview`, `isPreviewLoading`, `selectedTip`,
      `onSelectTip`, `tipAmounts`, `walletAmountToUse`, `finalAmountToPay`; renders fee/tax/total
    - `CheckoutPaymentSelector`: receives `paymentMethods`, `selectedPayment`, `onSelectPayment`,
      `useWallet`, `onToggleWallet`, `walletBalance`; renders payment method list
    - `CheckoutCouponSection`: receives `coupons`, `selectedCoupon`, `manualCode`,
      `onApplyCoupon`, `onRemoveCoupon`, `onManualCodeChange`; renders coupon input
    - `CheckoutRecommendedProducts`: receives `products`, `cart`, `onAddToCart`, `onGetCartItem`;
      renders recommended product carousel
    - `CheckoutWishlistSection`: receives `wishlist`, `sectionRef`; renders wishlist items;
      `sectionRef` is the `wishlistSectionRef` from task 4
    - `CheckoutOrderSuccess`: receives `orderId`, `show`; renders the post-order success overlay
    - Wrap each component in `React.memo` at the default export
    - _Requirements: 12.1, 12.2_

  - [x] 13.3 Refactor `CheckoutPage.jsx` to use the new sub-components
    - Move all state and handlers to remain in `CheckoutPage.jsx` (orchestrator)
    - Replace the inline JSX sections with the new sub-component calls, passing only the props
      each child needs
    - Pass `wishlistSectionRef` (from task 4) as the `sectionRef` prop to
      `CheckoutWishlistSection`
    - Verify that `pricingPreview` is only passed to `CheckoutPricingBreakdown` and
      `CheckoutCartSummary`; no other sub-component should receive it
    - _Requirements: 12.2, 12.3, 12.4, 12.5_

- [ ] 14. Reduce Framer Motion `animate` on list items across the customer module
  - Audit all `motion.div` wrappers on list items in the customer module
    (`frontend/src/modules/customer/`) — focus on product grids, cart item lists, and order
    history rows that render more than 5 items
  - Replace per-item `motion.div animate={...}` wrappers with a single `motion.div` on the list
    container using `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`; convert individual item
    wrappers to plain `<div>` with a CSS `transition-opacity` class
  - Retain `motion` only on: hero banners, modal overlays, page-level `AnimatePresence`
    transitions, and the `SlideToPay` interactive element
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 15. Create `useInViewAnimation` hook and apply to particle animation containers
  - [x] 15.1 Create `frontend/src/core/hooks/useInViewAnimation.js`
    - Implement the hook: `useRef` + `useState(false)` + `useEffect` that creates an
      `IntersectionObserver` with `rootMargin: "0px"`, sets `isVisible` on intersection change,
      and disconnects on unmount
    - Return `{ ref, isVisible }`
    - _Requirements: 14.4_

  - [x] 15.2 Apply `useInViewAnimation` to all particle animation containers
    - In `Home.jsx`: import and call `useInViewAnimation()`; attach `ref` to each floating-
      particle container; conditionally set `animate` to idle state when `!isVisible`
    - In `CheckoutPage.jsx`: apply the same pattern to any particle/floating animation containers
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 16. Add `useMemo` to context provider values
  - **Before making any changes, read each context file to check current state:**
  - `WishlistContext.jsx` — already has `useMemo` wrapping `wishlistValue`; verify the
    dependency array includes `wishlist`, `isFullDataFetched`, and `loading` — add any missing
    entries; do NOT add a second `useMemo` wrapper
  - `LocationContext.jsx` — already has `useMemo` wrapping `locationValue`; verify the
    dependency array includes `currentLocation`, `savedAddresses`, `isFetchingLocation`,
    `locationError`, and `refreshAddresses` — add any missing entries; do NOT add a second
    `useMemo` wrapper
  - `CartContext.jsx` — already has `useMemo` wrapping `cartValue`; verify the dependency array
    includes `cart`, `cartTotal`, `cartCount`, and `loading` — add any missing entries; do NOT
    add a second `useMemo` wrapper
  - `CartAnimationContext.jsx` — does **NOT** currently have `useMemo`; add
    `const value = useMemo(() => ({ animateAddToCart, animateRemoveFromCart }), [])` and pass
    `value` to the Provider (the two animation functions are stable refs so the dep array is
    empty — they are defined inside the component but never change)
  - `ProductDetailContext.jsx` — does **NOT** currently have `useMemo`; add
    `const value = useMemo(() => ({ selectedProduct, isOpen, openProduct, closeProduct }), [selectedProduct, isOpen])`
    and pass `value` to the Provider
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [-] 17. Add `IntersectionObserver` guard to `useTransform` scroll listeners in `Home.jsx`
  - Add `const heroRef = useRef(null)` and `const [heroVisible, setHeroVisible] = useState(true)`
  - Add a `useEffect` that creates an `IntersectionObserver` with `rootMargin: "0px"` on
    `heroRef.current`; update `heroVisible` on intersection change; disconnect on unmount
  - Modify the four `useTransform` calls (`opacity`, `y`, `scale`, `pointerEvents`) to use
    conditional input ranges: when `!heroVisible`, pass `[0, 0]` as the input range so the
    transforms produce a static value and the scroll subscription is effectively idle
  - Add the Tailwind class `will-change-transform` to the hero container element
  - Attach `ref={heroRef}` to the hero container
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [~] 18. Checkpoint — Phase 2 complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3 — Build & Bundle

- [~] 19. Update `frontend/vite.config.js` with `manualChunks`, `minify`, and `sourcemap`
  - Add a `build` key to the `defineConfig` object with:
    - `minify: "esbuild"`
    - `sourcemap: false`
    - `rollupOptions.output.manualChunks(id)` function that returns:
      - `"vendor-mui"` for `@mui/material`, `@mui/icons-material`, `@emotion/react`,
        `@emotion/styled`
      - `"vendor-motion"` for `framer-motion`
      - `"vendor-firebase"` for `firebase`
      - `"vendor-charts"` for `recharts`
  - Preserve all existing `plugins` and `resolve.alias` configuration
  - _Requirements: 17.1, 17.2, 17.5_

- [-] 20. Consolidate icon library usage in the customer module
  - [~] 20.1 Audit `react-icons` usage across the entire frontend
    - Search `frontend/src/modules/customer/` for any `react-icons` imports
    - **Finding from pre-implementation audit:** the customer module contains zero `react-icons`
      imports — all `react-icons` usage is in the seller module, admin module, and shared layout
      components (`Topbar.jsx`, `Sidebar.jsx`, `NotificationPopup.jsx`)
    - _Requirements: 18.1_

  - [~] 20.2 Confirm customer module uses only `lucide-react` for icons
    - Verify that all icon imports in `frontend/src/modules/customer/` use `lucide-react` or
      MUI icons exclusively
    - If any stray `react-icons` import is found, replace it with the `lucide-react` equivalent
      using the substitution table in the design doc
    - _Requirements: 18.2, 18.4_

  - [x] 20.3 Evaluate removing `react-icons` from `package.json` (BLOCKED — do not do this now)
    - **Do NOT remove `react-icons` from `frontend/package.json`** — the seller module, admin
      module, and shared layout components (`Topbar.jsx`, `Sidebar.jsx`, `NotificationPopup.jsx`)
      all import from `react-icons/hi` and `react-icons/hi2`; removing the package would break
      those modules entirely
    - This task is deferred until a separate seller/admin icon migration is planned
    - _Requirements: 18.5 (deferred)_

- [x] 21. Convert static Lottie JSON imports to dynamic `import()` with placeholder fallback
  - The following 7 files in the customer module have static Lottie JSON imports that must all
    be converted — missing any one of them leaves a large JSON blob in the initial bundle:
  - [x] 21.1 `CheckoutPage.jsx` — `Empty box.json`
    - Remove `import emptyBoxAnimation from "../../../assets/lottie/Empty box.json"`
    - Add `const [emptyBoxData, setEmptyBoxData] = useState(null)`
    - Add a `useEffect` that fires when `cart.length === 0`:
      `import("../../../assets/lottie/Empty box.json").then(m => setEmptyBoxData(m.default)).catch(() => {})`
    - In the empty-cart render branch: show `<Lottie animationData={emptyBoxData} loop />` when
      `emptyBoxData` is set, otherwise render `<div className="w-56 h-56" />` as placeholder
    - _Requirements: 19.1, 19.2, 19.4_
  - [x] 21.2 `Home.jsx` — `animation.json` (noServiceAnimation)
    - Remove `import noServiceAnimation from "@/assets/lottie/animation.json"`
    - Add `const [noServiceData, setNoServiceData] = useState(null)`
    - Load dynamically when the no-service state is active (products empty and not loading):
      `import("@/assets/lottie/animation.json").then(m => setNoServiceData(m.default)).catch(() => {})`
    - Replace `<Lottie animationData={noServiceAnimation} />` with a conditional render using
      `noServiceData`; show a same-size `<div>` placeholder while loading
    - _Requirements: 19.1, 19.2, 19.4_
  - [x] 21.3 `SearchPage.jsx` — `animation.json`
    - Apply the same dynamic import pattern as 21.2
    - _Requirements: 19.1, 19.2, 19.4_
  - [x] 21.4 `ProductDetailPage.jsx` — `animation.json`
    - Apply the same dynamic import pattern as 21.2
    - _Requirements: 19.1, 19.2, 19.4_
  - [x] 21.5 `CategoryProductsPage.jsx` — `animation.json`
    - Apply the same dynamic import pattern as 21.2
    - _Requirements: 19.1, 19.2, 19.4_
  - [x] 21.6 `CartPage.jsx` — `Empty box.json`
    - Apply the same dynamic import pattern as 21.1
    - _Requirements: 19.1, 19.2, 19.4_
  - [x] 21.7 `MainLocationHeader.jsx` — `shopping-cart.json`
    - Remove `import shoppingCartAnimation from "../../../../assets/lottie/shopping-cart.json"`
    - Add `const [cartAnimData, setCartAnimData] = useState(null)`
    - Load on mount: `import("../../../../assets/lottie/shopping-cart.json").then(m => setCartAnimData(m.default)).catch(() => {})`
    - Render `<Lottie animationData={cartAnimData} />` only when `cartAnimData` is set;
      show nothing (or a same-size placeholder) while loading — the cart icon is decorative so
      a brief placeholder is acceptable
    - _Requirements: 19.1, 19.2, 19.4_

- [~] 22. Checkpoint — Phase 3 complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4 — Backend

- [~] 23. Add all new TTL types to `TTL_CONFIG` in `cacheService.js` (Req 22)
  - Add the following entries to `TTL_CONFIG` (consolidating additions from tasks 9.1, 10, 11.1):
    ```js
    orders:        parseInt(process.env.CACHE_ORDERS_TTL         || "60",   10),
    nearbySellers: parseInt(process.env.CACHE_NEARBY_SELLERS_TTL || "300",  10),
    productList:   parseInt(process.env.CACHE_PRODUCT_LIST_TTL   || "300",  10),
    categoryName:  parseInt(process.env.CACHE_CATEGORY_NAME_TTL  || "3600", 10),
    ```
  - Verify `getTTL` returns `TTL_CONFIG[type] ?? 300` (the existing fallback is `|| 300` which
    is equivalent — no change needed)
  - _Requirements: 22.1, 22.3_

- [x] 24. Create entity name cache service and refactor `getProducts` to use it
  - [x] 24.1 Create `backend/app/services/entityNameCache.js`
    - This service resolves display names for both `Category` documents (headerId, categoryId,
      subcategoryId) and `Seller` documents (sellerId) — it must handle both models because
      `getProducts` populates all four fields
    - Implement `resolveCategoryName(id)`: builds key `buildKey("catalog", "categoryName", id)`,
      calls `getOrSet` with `Category.findById(id).select("name").lean()`, uses
      `getTTL("categoryName")`; returns `cat?.name ?? null`
    - Implement `resolveSellerName(id)`: builds key `buildKey("catalog", "sellerName", id)`,
      calls `getOrSet` with `Seller.findById(id).select("shopName").lean()`, uses
      `getTTL("categoryName")` (same 1-hour TTL is appropriate); returns `seller?.shopName ?? null`
    - Implement `invalidateCategoryName(id)`: calls
      `invalidate(buildKey("catalog", "categoryName", String(id)))`
    - Implement `invalidateSellerName(id)`: calls
      `invalidate(buildKey("catalog", "sellerName", String(id)))`
    - Export all four functions as named exports
    - Import `Category` from `../models/category.js` and `Seller` from `../models/seller.js`
    - _Requirements: 20.1, 20.2_

  - [x] 24.2 Refactor `getProducts` in `productController.js` to use cache-backed name resolution
    - Remove the four `.populate()` calls (`headerId`, `categoryId`, `subcategoryId`, `sellerId`)
      from the `Product.find()` query chain in `getProducts`
    - After `Product.find()` resolves, collect all unique IDs for category fields
      (`headerId`, `categoryId`, `subcategoryId`) and seller field (`sellerId`) separately
    - Resolve category IDs in parallel via `resolveCategoryName`; resolve seller IDs via
      `resolveSellerName` — do NOT use `resolveCategoryName` for `sellerId` since it queries
      the `Category` model and would return `null` for seller ObjectIds
    - Build a unified `nameMap` keyed by string ID
    - Map over `products` to produce `enriched` items with `{ _id, name }` objects for
      `headerId`, `categoryId`, `subcategoryId` and `{ _id, shopName }` for `sellerId`,
      matching the shape previously returned by `.populate()` so no frontend changes are needed
    - Import `resolveCategoryName`, `resolveSellerName` from `entityNameCache.js`
    - Apply the same refactor to `getSellerProducts` which also uses the same four `.populate()`
      calls — leave it using direct `.populate()` since seller requests bypass the cache anyway,
      OR apply the same cache-backed resolution for consistency; either choice is acceptable but
      must be documented in a code comment
    - _Requirements: 20.1, 20.4, 20.5_

  - [x] 24.3 Invalidate entity name cache on category and seller updates
    - In `backend/app/controller/categoryController.js`: import `invalidateCategoryName` from
      `entityNameCache.js`; call `await invalidateCategoryName(id)` after any category `update`
      or `delete` operation — the file already calls `invalidate("cache:catalog:categories:*")`
      for the category list cache; add the name cache invalidation alongside it
    - In `backend/app/controller/sellerController.js` (or wherever seller profile updates are
      handled): import `invalidateSellerName` from `entityNameCache.js`; call
      `await invalidateSellerName(sellerId)` after any seller `shopName` update
    - _Requirements: 20.3_

- [~] 25. Fix `structuredRequestLogger` middleware in `requestLogger.js`
  - Wrap the entire body of the `res.on("finish", () => { ... })` callback in a `try/catch`
    block; in the `catch`, call `console.error("[RequestLogger] Error in finish handler:", err)`
  - Verify that `next()` is called at the end of `structuredRequestLogger` (it already is —
    confirm no synchronous work precedes it)
  - Verify that `req.requestStartedAt` is set in `correlationIdMiddleware` before `next()` is
    called (it already is — confirm and leave unchanged)
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [~] 26. Final checkpoint — Phase 4 complete
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Phases 1–4 are independently shippable; complete Phase 1 before starting Phase 2
- Property tests use `fast-check` (already in `backend/devDependencies`) with Jest fake timers
- Cache invalidation tasks (9.3, 11.4, 24.3) must be completed in the same PR as their
  corresponding `getOrSet` wrapping tasks to avoid stale-cache windows

### Safety notes from pre-implementation audit

| Task | Safety constraint |
|---|---|
| 3.1 | `localStorage` flush-on-unmount is guarded by `if (isAuthenticated) return` — never writes for authenticated users |
| 9.2 | Cache key includes `page` and `limit` — paginated results are isolated per page |
| 9.3 | Wildcard invalidation `${customerId}:*` clears all pages for a customer atomically |
| 10 | Remove `getRedisClient` import only after confirming no other usage in the file; remove `NEARBY_CACHE_TTL_S` constant |
| 16 | `WishlistContext`, `LocationContext`, `CartContext` already have `useMemo` — only verify/fix dep arrays; only `CartAnimationContext` and `ProductDetailContext` need new `useMemo` wrappers |
| 20.3 | Do NOT remove `react-icons` from `package.json` — seller and admin modules depend on it heavily |
| 21 | All 7 Lottie JSON files must be converted (not just 2) — see sub-tasks 21.1–21.7 |
| 24.1 | Service is named `entityNameCache.js` (not `categoryNameCache.js`) — it handles both `Category` and `Seller` name lookups; `sellerId` must use `Seller.findById` returning `shopName`, not `Category.findById` |
