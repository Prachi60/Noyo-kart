# Requirements Document

## Introduction

This document defines the performance optimization requirements for the MERN-stack quick-commerce
customer application. The app consists of a React 19 / Vite frontend and a Node.js / Express 5
backend backed by MongoDB, Redis, and Socket.IO. Profiling has identified 22 discrete bottlenecks
grouped into four delivery phases:

- **Phase 1 – Quick Wins**: Low-risk, high-impact changes that can ship independently (compression,
  debouncing, lazy loading, caching, memoization).
- **Phase 2 – Component Architecture**: Structural refactors to CheckoutPage and context providers
  that require coordinated frontend changes.
- **Phase 3 – Build & Bundle**: Vite configuration and dependency hygiene that affect the entire
  frontend build pipeline.
- **Phase 4 – Backend**: Server-side caching, query optimisation, and middleware improvements.

All optimisations target the **customer module** unless explicitly stated otherwise.

---

## Glossary

- **CheckoutPage**: `frontend/src/modules/customer/pages/CheckoutPage.jsx` — a 2 015-line React
  component that owns checkout state, pricing preview, order placement, and post-order tracking.
- **CartContext**: `frontend/src/modules/customer/context/CartContext.jsx` — React context that
  holds the customer's cart state and syncs it to `localStorage` and the backend.
- **CustomerApi**: `frontend/src/modules/customer/services/customerApi.js` — the Axios-based API
  client used by all customer-facing pages.
- **ProductCard**: `frontend/src/modules/customer/components/shared/ProductCard.jsx` — a reusable
  card component rendered in lists across the customer module.
- **CacheService**: `backend/app/services/cacheService.js` — the Redis-backed cache-aside service
  used by backend controllers.
- **RequestLogger**: `backend/app/middleware/requestLogger.js` — Express middleware that logs every
  HTTP request and records Prometheus metrics.
- **Debounce_Window**: A configurable delay (default 400 ms) after the last triggering event before
  a deferred action executes.
- **TTL**: Time-to-live — the duration (in seconds) for which a cached value is considered fresh.
- **Intersection_Observer**: The browser `IntersectionObserver` API used to detect when a DOM
  element enters or leaves the viewport.
- **manualChunks**: A Vite `build.rollupOptions.output.manualChunks` configuration that controls
  how the bundler splits vendor code into separate files.
- **Lottie_JSON**: A JSON animation file consumed by the `lottie-react` library.
- **Cloudinary_Transform**: URL query parameters appended to Cloudinary image URLs (e.g.
  `?w=300&f=webp&q=auto`) that instruct Cloudinary's CDN to resize and re-encode images on the fly.
- **checkoutPreview**: The `/orders/checkout/preview` API endpoint that computes live pricing
  (delivery fee, taxes, discounts) for the current cart state.
- **getMyOrders**: The `/orders/my-orders` API endpoint that returns the authenticated customer's
  order history.
- **getNearbySellers**: The `/seller/nearby` API endpoint that returns sellers within the
  customer's delivery radius.
- **getProducts**: The `/products` API endpoint that returns a paginated, filtered product list.
- **populate()**: Mongoose's `.populate()` method that resolves ObjectId references to full
  documents (e.g. resolving `categoryId` to a category name).
- **React_memo**: `React.memo` — a higher-order component that skips re-rendering when props have
  not changed.
- **useTransform**: A Framer Motion hook that maps one motion value to another, typically used for
  scroll-driven animations.

---

## Requirements

---

### Requirement 1 — Gzip Compression on Express Backend

**User Story:** As a customer on a slow mobile connection, I want API responses and static assets
to be compressed, so that pages load faster and less data is transferred.

#### Acceptance Criteria

1. THE Express_Server SHALL apply gzip compression to all HTTP responses whose `Content-Type`
   matches `text/*`, `application/json`, or `application/javascript`.
2. WHEN a client sends a request with `Accept-Encoding: gzip`, THE Express_Server SHALL return a
   response with `Content-Encoding: gzip` in the response headers.
3. WHEN a client sends a request without `Accept-Encoding: gzip`, THE Express_Server SHALL return
   an uncompressed response and SHALL NOT include a `Content-Encoding` header.
4. THE Express_Server SHALL compress responses whose uncompressed body exceeds 1 024 bytes; bodies
   at or below this threshold SHALL be sent uncompressed.
5. THE Express_Server SHALL register the compression middleware before all route handlers so that
   every route benefits from compression.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 2 — Debounce checkoutPreview API Calls

**User Story:** As a customer on the checkout page, I want pricing to update smoothly without
hammering the server, so that the page remains responsive even when I change multiple options
quickly.

#### Acceptance Criteria

1. WHEN the customer changes any of the checkout state values (cart contents, payment method, tip
   amount, time slot, discount, saved recipient, current address, or current location), THE
   CheckoutPage SHALL wait 400 ms after the last change before calling the `checkoutPreview`
   endpoint.
2. WHEN multiple checkout state changes occur within a 400 ms window, THE CheckoutPage SHALL
   issue exactly one `checkoutPreview` API call — not one call per change.
3. WHEN the CheckoutPage unmounts while a debounced call is pending, THE CheckoutPage SHALL cancel
   the pending call and SHALL NOT issue the API request.
4. WHEN the debounce timer fires and the cart is empty or the user is not authenticated, THE
   CheckoutPage SHALL NOT call the `checkoutPreview` endpoint.

**Correctness Properties:**

- **Debounce coalescence (property):** For any sequence of N ≥ 2 state changes all occurring
  within a 400 ms window, the number of `checkoutPreview` calls equals 1.
- **Debounce delay (property):** For any single state change, the `checkoutPreview` call is made
  no earlier than 400 ms after the change.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 3 — Debounce Cart localStorage Writes

**User Story:** As a guest customer, I want my cart to be saved reliably without degrading
browser performance, so that rapid quantity changes do not cause excessive storage writes.

#### Acceptance Criteria

1. WHEN the cart state changes and the user is not authenticated, THE CartContext SHALL schedule a
   `localStorage.setItem("cart", …)` write to execute 300 ms after the last cart change.
2. WHEN multiple cart changes occur within a 300 ms window, THE CartContext SHALL write to
   `localStorage` exactly once — after the final change settles.
3. WHEN the CartContext unmounts while a debounced write is pending, THE CartContext SHALL flush
   the pending write immediately so that no cart data is lost.
4. WHILE the user is authenticated, THE CartContext SHALL NOT write cart state to `localStorage`
   (the backend is the source of truth).

**Correctness Properties:**

- **Write coalescence (property):** For any sequence of N ≥ 2 cart changes all occurring within a
  300 ms window, `localStorage.setItem` is called exactly once.
- **No data loss on unmount (property):** After unmount with a pending write, the value stored in
  `localStorage` equals the last cart state before unmount.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 4 — Lazy-load Wishlist on CheckoutPage

**User Story:** As a customer on the checkout page, I want the page to load quickly without
fetching data I may never see, so that the initial render is fast.

#### Acceptance Criteria

1. WHEN the CheckoutPage mounts, THE CheckoutPage SHALL NOT call `fetchFullWishlist` immediately
   on mount.
2. WHEN the wishlist section scrolls into the viewport (as detected by an Intersection_Observer
   with a `rootMargin` of `"200px"`), THE CheckoutPage SHALL call `fetchFullWishlist` exactly
   once.
3. WHEN `fetchFullWishlist` has already been called during the current page session, THE
   CheckoutPage SHALL NOT call it again even if the wishlist section re-enters the viewport.
4. IF the browser does not support `IntersectionObserver`, THEN THE CheckoutPage SHALL fall back
   to calling `fetchFullWishlist` on mount.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 5 — Stop Re-fetching Recommended Products on Quantity Change

**User Story:** As a customer adjusting cart quantities, I want the recommended products section
to remain stable, so that the page does not flicker or make unnecessary network requests.

#### Acceptance Criteria

1. THE CheckoutPage SHALL fetch recommended products only when the set of unique product IDs in
   the cart changes (items added or removed), not when quantities change.
2. WHEN a customer increments or decrements the quantity of an existing cart item, THE CheckoutPage
   SHALL NOT issue a new `getProducts` API call.
3. WHEN a customer adds a new product to the cart, THE CheckoutPage SHALL re-fetch recommended
   products using the first cart item's `categoryId`.
4. WHEN the cart becomes empty, THE CheckoutPage SHALL clear the recommended products list and
   SHALL NOT issue a `getProducts` API call.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 6 — Replace Polling with Pure WebSocket After Order Placement

**User Story:** As a customer waiting for seller acceptance after placing an order, I want real-time
status updates without redundant polling, so that the app uses less battery and bandwidth.

#### Acceptance Criteria

1. WHEN an order is successfully placed, THE CheckoutPage SHALL listen for order status updates
   exclusively via the WebSocket `onOrderStatusUpdate` listener.
2. THE CheckoutPage SHALL NOT start a `setInterval` polling loop after order placement.
3. WHEN the WebSocket connection is unavailable at the time of order placement, THE CheckoutPage
   SHALL fall back to a single `getOrderDetails` call 4 seconds after placement and SHALL retry
   every 4 seconds until the WebSocket reconnects or the order reaches a terminal state.
4. WHEN the order reaches a terminal state (`CANCELLED`, `ACCEPTED`, or `DELIVERED`), THE
   CheckoutPage SHALL stop all polling and SHALL disconnect the WebSocket listener for that order.
5. WHEN the CheckoutPage unmounts, THE CheckoutPage SHALL cancel any active polling interval and
   SHALL call `leaveOrderRoom` to clean up the WebSocket subscription.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 7 — Wrap ProductCard in React.memo

**User Story:** As a customer browsing product lists, I want the UI to remain smooth when the
parent component re-renders, so that individual product cards do not re-render unnecessarily.

#### Acceptance Criteria

1. THE ProductCard SHALL be exported as a `React_memo`-wrapped component.
2. WHEN the parent component re-renders with identical props for a ProductCard instance, THE
   ProductCard SHALL NOT re-render.
3. WHEN any prop of a ProductCard instance changes, THE ProductCard SHALL re-render exactly once.
4. WHERE a custom equality function is needed (e.g. for object props), THE ProductCard SHALL
   accept an optional `areEqual` comparator passed to `React.memo`.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 8 — Add loading="lazy" to All Customer Images

**User Story:** As a customer on a slow connection, I want images below the fold to load only when
they are about to enter the viewport, so that the initial page load is faster.

#### Acceptance Criteria

1. THE Customer_App SHALL add `loading="lazy"` to every `<img>` element in the customer module
   that is not the Largest Contentful Paint (LCP) candidate (i.e. not the first above-the-fold
   hero image).
2. WHEN an image URL is served from Cloudinary, THE Customer_App SHALL append the transformation
   parameters `?w=300&f=webp&q=auto` to the URL before rendering the `<img>` tag.
3. WHEN a Cloudinary URL already contains query parameters, THE Customer_App SHALL append the
   transformation parameters using `&` rather than `?`.
4. THE ProductCard SHALL apply Cloudinary transformation parameters to its `image` prop before
   rendering.

**Phase:** 1 — Quick Wins  
**Dependency:** None

---

### Requirement 9 — TTL Caching for getMyOrders

**User Story:** As a customer viewing my order history, I want the list to load instantly on
repeat visits within a short window, so that I do not wait for a database round-trip every time.

#### Acceptance Criteria

1. WHEN the `getMyOrders` endpoint is called, THE CacheService SHALL return the cached result if a
   valid cache entry exists for the requesting customer's ID with a TTL of 60 seconds.
2. WHEN no cache entry exists or the TTL has expired, THE CacheService SHALL fetch the order list
   from MongoDB, store it under a customer-scoped cache key, and return the result.
3. WHEN an order is created, cancelled, or updated for a customer, THE CacheService SHALL
   invalidate that customer's `getMyOrders` cache entry immediately.
4. THE cache key for `getMyOrders` SHALL be scoped to the authenticated customer's ID so that one
   customer's cache does not affect another's.

**Correctness Properties:**

- **Round-trip (property):** For any customer ID, the value returned from cache equals the value
  that would be returned by a direct MongoDB query for the same customer.
- **Isolation (property):** Invalidating the cache for customer A does not affect the cached
  result for customer B.

**Phase:** 1 — Quick Wins  
**Dependency:** Requirement 22 (CacheService must be available)

---

### Requirement 10 — TTL Caching for getNearbySellers

**User Story:** As a customer browsing products, I want the nearby-sellers lookup to be fast on
repeat requests, so that product list pages load without waiting for a geospatial database query
every time.

#### Acceptance Criteria

1. WHEN `getNearbySellers` is called with a `(lat, lng)` pair, THE CacheService SHALL return the
   cached result if a valid entry exists for that coordinate pair with a TTL of 300 seconds.
2. WHEN no cache entry exists or the TTL has expired, THE CacheService SHALL execute the
   geospatial query, cache the result under a coordinate-scoped key, and return the result.
3. THE cache key SHALL encode the latitude and longitude rounded to 4 decimal places so that
   requests within approximately 11 metres of each other share the same cache entry.
4. WHEN a seller's location or active status changes, THE CacheService SHALL invalidate all
   `getNearbySellers` cache entries for the affected geographic area.

**Correctness Properties:**

- **Round-trip (property):** For any `(lat, lng)` pair, the cached seller list equals the list
  returned by a direct geospatial query for the same coordinates.

**Phase:** 1 — Quick Wins  
**Dependency:** Requirement 22 (CacheService must be available)

---

### Requirement 11 — TTL Caching for getProducts

**User Story:** As a customer browsing the product catalogue, I want product lists to load
instantly on repeat visits, so that category browsing feels snappy.

#### Acceptance Criteria

1. WHEN `getProducts` is called with a set of query parameters, THE CacheService SHALL return the
   cached result if a valid entry exists for that parameter set with a TTL of 300 seconds.
2. WHEN no cache entry exists or the TTL has expired, THE CacheService SHALL execute the MongoDB
   query, cache the result under a parameter-scoped key, and return the result.
3. THE cache key SHALL be derived from a deterministic serialisation of the query parameters
   (sorted keys, normalised values) so that equivalent queries share the same cache entry.
4. WHEN a product is created, updated, or deleted, THE CacheService SHALL invalidate all
   `getProducts` cache entries that could include that product.
5. THE CacheService SHALL NOT cache `getProducts` responses for admin or seller roles (only
   customer/public requests are cached).

**Correctness Properties:**

- **Round-trip (property):** For any query parameter set, the cached product list equals the list
  returned by a direct MongoDB query with the same parameters.
- **Determinism (property):** Two calls with logically equivalent query parameters (same keys,
  same values, different order) produce the same cache key.

**Phase:** 1 — Quick Wins  
**Dependency:** Requirement 22 (CacheService must be available)

---

### Requirement 12 — Split CheckoutPage into Isolated Sub-components

**User Story:** As a developer maintaining the checkout flow, I want the 2 015-line CheckoutPage
to be decomposed into focused sub-components, so that a state change in one section does not
trigger a full-page re-render.

#### Acceptance Criteria

1. THE CheckoutPage SHALL be refactored into at minimum the following sub-components, each in its
   own file:
   - `CheckoutAddressSection` — delivery address display and editing
   - `CheckoutCartSummary` — cart item list with quantity controls
   - `CheckoutPricingBreakdown` — fee, tax, tip, and total display
   - `CheckoutPaymentSelector` — payment method selection
   - `CheckoutCouponSection` — coupon input and validation
   - `CheckoutRecommendedProducts` — recommended product carousel
   - `CheckoutWishlistSection` — wishlist items display
   - `CheckoutOrderSuccess` — post-order success overlay
2. EACH sub-component SHALL receive only the props it needs; no sub-component SHALL receive the
   entire cart or pricing state unless it directly renders that data.
3. WHEN the pricing preview updates, ONLY `CheckoutPricingBreakdown` SHALL re-render; all other
   sub-components SHALL remain stable.
4. WHEN the cart quantity changes, ONLY `CheckoutCartSummary` and `CheckoutPricingBreakdown` SHALL
   re-render.
5. THE CheckoutPage SHALL continue to pass all existing end-to-end tests after the refactor.

**Phase:** 2 — Component Architecture  
**Dependency:** Requirement 7 (React.memo), Requirement 2 (debounced preview)

---

### Requirement 13 — Reduce Framer Motion animate Usage

**User Story:** As a customer on a mid-range Android device, I want the app to feel smooth without
excessive GPU-composited animations, so that scrolling and interactions are not janky.

#### Acceptance Criteria

1. THE Customer_App SHALL NOT apply a Framer Motion `animate` prop to list item wrappers that
   render more than 5 items (e.g. product grids, cart item lists, order history rows).
2. WHEN an element requires an entrance animation, THE Customer_App SHALL use CSS transitions or
   a single `initial`/`animate` pair on the list container rather than on each individual item.
3. THE Customer_App SHALL retain Framer Motion `animate` only on hero banners, modal overlays,
   page-level transitions, and explicitly designated interactive elements.
4. WHEN a page-level route transition occurs, THE Customer_App SHALL use a single `AnimatePresence`
   wrapper at the router level rather than per-component wrappers.

**Phase:** 2 — Component Architecture  
**Dependency:** None

---

### Requirement 14 — Stop Off-Screen Particle Animations

**User Story:** As a customer scrolling past animated sections, I want background particle
animations to pause when they are not visible, so that the CPU and GPU are not wasted on invisible
work.

#### Acceptance Criteria

1. WHEN a floating-particle animation container is not intersecting the viewport (as reported by
   an Intersection_Observer), THE Customer_App SHALL pause all Framer Motion animations within
   that container by setting `animate` to a static/idle state.
2. WHEN the container re-enters the viewport, THE Customer_App SHALL resume the animations from
   their idle state.
3. THE Intersection_Observer SHALL use a `rootMargin` of `"0px"` so that animations pause as soon
   as the container leaves the viewport.
4. THE Customer_App SHALL create at most one Intersection_Observer instance per animated container
   and SHALL disconnect it when the container unmounts.

**Phase:** 2 — Component Architecture  
**Dependency:** None

---

### Requirement 15 — Prevent Unnecessary Re-renders from Context Providers

**User Story:** As a developer, I want context provider values to be stable between renders, so
that consumers do not re-render when unrelated state changes.

#### Acceptance Criteria

1. THE WishlistProvider, CartProvider, CartAnimationProvider, ProductDetailProvider, and
   LocationProvider SHALL wrap their context value objects in `useMemo` so that a new object
   reference is only created when the underlying data changes.
2. WHEN a context provider re-renders due to an internal state change that does not affect the
   exported value, THE context consumers SHALL NOT re-render.
3. THE CartProvider SHALL include `cart`, `cartTotal`, `cartCount`, and `loading` in the `useMemo`
   dependency array so that consumers re-render only when these values change.
4. THE WishlistProvider SHALL include `wishlist` and `isFullDataFetched` in the `useMemo`
   dependency array.

**Phase:** 2 — Component Architecture  
**Dependency:** None

---

### Requirement 16 — Optimise useTransform Scroll Listeners on Home Page

**User Story:** As a customer scrolling the home page, I want scroll-driven animations to be
smooth without blocking the main thread, so that the page does not stutter.

#### Acceptance Criteria

1. THE Home_Page SHALL limit the number of active `useTransform` scroll listeners to at most 4
   simultaneously (opacity, y-position, scale, pointer-events).
2. WHEN a scroll-driven animated section is not visible in the viewport, THE Home_Page SHALL
   suspend its `useTransform` subscriptions using an Intersection_Observer guard.
3. THE Home_Page SHALL NOT perform DOM reads (e.g. `getBoundingClientRect`) inside a
   `useTransform` callback; all layout reads SHALL be performed outside the scroll handler.
4. THE Home_Page SHALL use `will-change: transform` on elements driven by `useTransform` to hint
   the browser to promote them to their own compositor layer.

**Phase:** 2 — Component Architecture  
**Dependency:** None

---

### Requirement 17 — Vite Build Optimisations (manualChunks + Minification)

**User Story:** As a customer on a first visit, I want the app to load quickly by downloading only
the code needed for the current page, so that the initial bundle is small.

#### Acceptance Criteria

1. THE Vite_Build SHALL configure `build.rollupOptions.output.manualChunks` to place the
   following libraries in separate named chunks:
   - `vendor-mui` — `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
   - `vendor-motion` — `framer-motion`
   - `vendor-firebase` — `firebase`
   - `vendor-charts` — `recharts`
2. THE Vite_Build SHALL enable `build.minify: "esbuild"` (or `"terser"`) to minify all output
   JavaScript.
3. WHEN the build completes, THE Vite_Build SHALL produce a main application chunk smaller than
   500 KB (uncompressed).
4. WHEN the build completes, no single vendor chunk SHALL exceed 1 MB (uncompressed).
5. THE Vite_Build SHALL enable `build.sourcemap: false` in production to avoid shipping source
   maps to end users.

**Phase:** 3 — Build & Bundle  
**Dependency:** None

---

### Requirement 18 — Remove Duplicate Icon Library

**User Story:** As a developer, I want a single icon library in the frontend bundle, so that we
do not ship two icon sets that serve the same purpose.

#### Acceptance Criteria

1. THE Frontend_Bundle SHALL contain exactly one of `react-icons` or `lucide-react` as an icon
   library for the customer module; the other SHALL be removed from `package.json`.
2. WHEN `lucide-react` is retained, all `react-icons` imports in the customer module SHALL be
   replaced with equivalent `lucide-react` icons before the library is removed.
3. WHEN `react-icons` is retained, all `lucide-react` imports in the customer module SHALL be
   replaced with equivalent `react-icons` icons before the library is removed.
4. THE Frontend_Bundle SHALL continue to render all icons correctly after the removal.
5. THE `package.json` SHALL NOT list the removed icon library as a dependency after the change.

**Note:** The recommended choice is to retain `lucide-react` (already used in CheckoutPage and
Home) and remove `react-icons`, since `lucide-react` supports tree-shaking more effectively with
Vite.

**Phase:** 3 — Build & Bundle  
**Dependency:** Requirement 17 (build pipeline must be stable before bundle size is measured)

---

### Requirement 19 — Dynamically Import Lottie JSON Animation Files

**User Story:** As a customer on a first visit, I want Lottie animation data to not block the
initial page load, so that the app becomes interactive faster.

#### Acceptance Criteria

1. THE Customer_App SHALL import all Lottie JSON animation files using dynamic `import()` (lazy
   import) rather than static top-level `import` statements.
2. WHEN a Lottie animation component is rendered for the first time, THE Customer_App SHALL load
   the corresponding JSON file asynchronously and display a lightweight placeholder (e.g. a
   spinner or empty div) until the data is available.
3. THE Vite_Build SHALL place each Lottie JSON file in a separate chunk so that it is only
   downloaded when the animation is first rendered.
4. THE Customer_App SHALL handle the case where a Lottie JSON file fails to load by rendering
   nothing (no error boundary crash).

**Phase:** 3 — Build & Bundle  
**Dependency:** Requirement 17 (manualChunks must be configured first)

---

### Requirement 20 — Optimise .populate() Calls with Category Name Caching

**User Story:** As a customer browsing products, I want product list queries to be fast even when
they join category data, so that the API responds quickly under load.

#### Acceptance Criteria

1. WHEN `getProducts` executes a `.populate("categoryId", "name")` call, THE ProductController
   SHALL resolve category names from the CacheService rather than issuing a separate MongoDB
   lookup for each product.
2. THE CacheService SHALL cache category name lookups under a key scoped to the category's `_id`
   with a TTL of 3 600 seconds (1 hour), matching the existing `categories` TTL configuration.
3. WHEN a category name is updated in the database, THE CacheService SHALL invalidate the
   corresponding category name cache entry.
4. THE optimisation SHALL apply to all four `.populate()` calls in `getProducts`:
   `headerId`, `categoryId`, `subcategoryId`, and `sellerId`.
5. THE ProductController SHALL fall back to a direct `.populate()` call if the CacheService is
   unavailable, ensuring no degradation in correctness.

**Correctness Properties:**

- **Round-trip (property):** For any category `_id`, the name returned from cache equals the name
  stored in the MongoDB `categories` collection.
- **Staleness bound (property):** After a category name update, the cached name is invalidated
  within 1 TTL period (3 600 seconds) at most.

**Phase:** 4 — Backend  
**Dependency:** Requirement 11 (getProducts caching), Requirement 22 (CacheService)

---

### Requirement 21 — Async structuredRequestLogger Middleware

**User Story:** As a backend engineer, I want the request logger to not add latency to API
responses, so that logging overhead is invisible to customers.

#### Acceptance Criteria

1. THE RequestLogger SHALL call `next()` synchronously before performing any logging or metrics
   recording work.
2. THE RequestLogger SHALL attach all logging and metrics work to the `res.on("finish", …)` event
   so that it executes after the response has been sent to the client.
3. THE RequestLogger SHALL NOT perform any synchronous I/O (file writes, console output) in the
   request path before `next()` is called.
4. WHEN the `res.on("finish", …)` callback throws an error, THE RequestLogger SHALL catch the
   error and log it without crashing the process.
5. THE RequestLogger SHALL record the request start time before calling `next()` so that the
   measured duration includes the full request handling time.

**Phase:** 4 — Backend  
**Dependency:** None

---

### Requirement 22 — CacheService Availability (Cross-cutting)

**User Story:** As a backend engineer, I want all caching requirements to rely on the existing
CacheService, so that cache behaviour is consistent and observable across all endpoints.

#### Acceptance Criteria

1. THE CacheService SHALL be used as the single caching abstraction for all new TTL caching
   requirements (Requirements 9, 10, 11, 20).
2. WHEN Redis is unavailable, THE CacheService SHALL fall back gracefully to direct database
   queries without throwing unhandled errors.
3. THE CacheService SHALL expose a `getTTL(type)` function that returns the configured TTL for a
   named cache type; new types (`orders`, `nearbySellers`, `productList`) SHALL be added to the
   `TTL_CONFIG` map.
4. THE CacheService SHALL emit Prometheus counter metrics (`cache_hit_total`, `cache_miss_total`)
   for all new cache keys so that cache effectiveness can be monitored.

**Phase:** 4 — Backend  
**Dependency:** None (CacheService already exists; this requirement governs its extension)

---

## Phase Summary and Dependencies

| Phase | Requirements | Key Dependencies |
|-------|-------------|-----------------|
| **Phase 1 – Quick Wins** | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 | Req 9/10/11 depend on Req 22 |
| **Phase 2 – Component Architecture** | 12, 13, 14, 15, 16 | Req 12 depends on Req 7 and Req 2 |
| **Phase 3 – Build & Bundle** | 17, 18, 19 | Req 18/19 depend on Req 17 |
| **Phase 4 – Backend** | 20, 21, 22 | Req 20 depends on Req 11 and Req 22 |

Phases 1 and 4 can be worked in parallel by separate frontend and backend engineers. Phase 2
should begin after Phase 1 is merged. Phase 3 can proceed independently of Phases 2 and 4.
