# Apple App Store Web - Architecture Quick Reference

## TL;DR - Key Takeaways

### 1. Store Patterns
- **NOT Redux/Zustand** - Uses Svelte's native `writable()` and `readable()` stores
- Only 3 store files total (i18n, modalPage, carouselStyle)
- Stores are for UI state only, not data fetching
- Context-based injection: `getContext('store-name')`

### 2. Data Fetching
- **Prefetched Intents** - Server renders → embeds data in HTML → client hydrates
- No separate HTTP caching layer - relies on browser cache + prefetched data
- Intents = unit of data (fetchable business logic)
- Deduplication: checks if intent already dispatched before re-fetching

### 3. Services
All services live in `/src/jet/dependencies/`:

| Service | Purpose | File |
|---------|---------|------|
| **Net** | HTTP client with JWT/correlation headers | `net.ts` |
| **User** | Profile (stub on web - no auth) | `user.ts` |
| **Storage** | In-memory Map wrapper (no persistence) | `storage.ts` |
| **Localization** | i18n with key transformation | `localization.ts` |
| **SEO** | Page-specific metadata generator | `seo.ts` |
| **Bag** | Feature flags & remote config | `bag.ts` |

**Assembly:** `makeDependencies()` → returns object → `makeObjectGraph()` assembles into ObjectGraph

### 4. User/Profile Data
- Web client is **unauthenticated** (stub user object)
- No persistent session or localStorage usage
- Profile data flows through context: `context.set('user', user)`
- User object matches AppStoreKit interface but all fields undefined on web

### 5. Intent-Driven Architecture
```
URL Changed → Router finds Intent → Intent.perform(objectGraph) → Page Promise
    ↓
Action Handler catches → 500ms debounce → updateApp() → Svelte reactivity
    ↓
History state saved → Browser state updated → Modal presentations handled
```

### 6. Context Management
- Per-component state using `setContext()` / `getContext()`
- WeakMap for automatic garbage collection
- Hierarchical (page → component → subcomponent)
- Example: Accessibility layout config set at page level, retrieved at shelf level

---

## File Locations (Absolute Paths)

**Stores:**
```
/Users/karen/Desktop/apps.apple.com-main/src/stores/
├── i18n.ts                      (Readable)
├── modalPage.ts                 (Writable with custom API)
└── carousel-media-style.ts      (Simple writable)
```

**Core Services (Dependency Injection):**
```
/Users/karen/Desktop/apps.apple.com-main/src/jet/dependencies/
├── make-dependencies.ts         (DI Factory)
├── object-graph.ts              (DI Assembly)
├── net.ts                        (HTTP Client)
├── user.ts                       (Profile/Auth)
├── storage.ts                    (Storage Wrapper)
├── localization.ts              (i18n Service)
├── seo.ts                        (SEO Generator)
└── bag.ts                        (Feature Flags)
```

**Routing & Actions:**
```
/Users/karen/Desktop/apps.apple.com-main/src/jet/
├── bootstrap.ts                 (Runtime Init)
├── jet.ts                        (Jet Engine)
├── action-handlers/
│   └── flow-action.ts           (Main Router Handler - 15KB)
└── intents/
    ├── route-url/               (URL Routing Intent)
    ├── lint-metrics-event/      (Metrics Intent)
    └── error-page/              (Error Handling Intent)
```

**Context & Components:**
```
/Users/karen/Desktop/apps.apple.com-main/src/
├── context/
│   ├── accessibility-layout.ts  (WeakMap-based config)
│   └── today-card-layout.ts     (Similar pattern)
├── browser.ts                   (Entry point)
├── bootstrap.ts                 (App init)
└── App.svelte                   (Root component)
```

---

## Code Patterns to Copy

### Pattern 1: SSR-Safe Store
```typescript
const myStore: Writable<State> = (() => {
    if (typeof window === 'undefined') {
        return { subscribe: () => {}, set: () => {}, update: () => {} };
    }
    return writable(initialState);
})();
```

### Pattern 2: Context-Based Service Injection
```typescript
// Setup (bootstrap.ts)
const context = new Map();
context.set('myService', serviceInstance);

// Usage (component.ts)
const service = getContext('myService');
```

### Pattern 3: WeakMap for Per-Instance Config
```typescript
const configStore = new WeakMap<Item, Config>();
for (let item of items) {
    configStore.set(item, computeConfig(item));
}
setContext('configStore', configStore);

// In component
const config = getContext('configStore').get(item) ?? DEFAULT;
```

### Pattern 4: Service Wrapper (HTTP Client)
```typescript
export class Net implements Network {
    private readonly underlyingFetch: FetchFunction;
    
    async fetch(request: FetchRequest): Promise<FetchResponse> {
        // Add headers
        request.headers['origin'] = 'https://apps.apple.com';
        request.headers['authorization'] = token;
        
        // Instrument
        const start = Date.now();
        const response = await this.underlyingFetch(url, request);
        const end = Date.now();
        
        // Return enhanced response
        return { ...response, metrics: [{ time: end - start }] };
    }
}
```

### Pattern 5: Intent-Based Data Fetching
```typescript
export const MyIntentController: IntentController<MyIntent> = {
    async perform(intent: MyIntent, objectGraph: AppStoreObjectGraph) {
        // Fetch data
        const data = await objectGraph.network.fetch(...);
        
        // Return page + metadata
        return {
            intent: intent,           // For SSR
            action: makeAction(...),  // For client
            storefront: ...,
            language: ...,
        };
    }
};
```

---

## Design Decisions - Why This Approach?

| Pattern | Why? |
|---------|------|
| Svelte stores instead of Redux | App is primarily view-driven; stores only hold UI state |
| No Redux/Zustand | Overkill for 3 small stores; Svelte reactivity is sufficient |
| Prefetched intents | SSR→client transition without flash; avoid redundant requests |
| Intent-based routing | Unifies SSR + client; intents are composable and testable |
| Dependency injection | Decouples from AppStoreKit; enables testing with mocks |
| Context API | Hierarchical state; no global pollution; per-component scope |
| No user persistence | Web client is read-only; auth is server-side; stateless design |
| WeakMap for config | Automatic GC; no memory leaks; scales with component tree |

---

## Architecture Flow Diagram (ASCII)

```
┌─ User Interaction ──────────────┐
│                                 │
│  Click → FlowAction → Jet       │
│                                 ▼
│                    ┌──────────────────────┐
│                    │ Intent Dispatcher    │
│                    │ (registered handlers)│
│                    └──────────┬───────────┘
│                               │
│     ┌─────────────────────────┼─────────────────────────┐
│     │                         │                         │
│     ▼                         ▼                         ▼
│ RouteUrl         ProductPage              SearchResults
│ Controller       Controller               Controller
│     │                │                        │
│     └────────────────┼────────────────────────┘
│                      ▼
│          ┌──────────────────────┐
│          │ Fetch from API       │
│          │ (via Net service)    │
│          └──────────┬───────────┘
│                     ▼
│          ┌──────────────────────┐
│          │ Page Promise         │
│          │ (resolves after 500ms│
│          │  or immediately)     │
│          └──────────┬───────────┘
│                     ▼
│          ┌──────────────────────┐
│          │ updateApp(page)      │
│          │ (Svelte reactivity)  │
│          └──────────┬───────────┘
│                     ▼
│          ┌──────────────────────┐
│          │ Update Browser       │
│          │ History & Render UI  │
│          └──────────────────────┘
│
└─ Popstate (Back/Forward Button) ───┐
                                     │
              ┌──────────────────────┼─────────────────┐
              │                      │                 │
              ▼                      ▼                 ▼
       History State             Check if old     Re-fetch if
       Exists?                   page cached?     not cached
            │                        │                 │
        Yes │                    Yes │             No │
            ▼                        ▼                 ▼
       Restore Page           Use cached          Dispatch
       from History           page object         intent again
            │                      │                 │
            └──────────┬───────────┼─────────────────┘
                       ▼
            ┌──────────────────────┐
            │ updateApp(page)      │
            └──────────────────────┘
```

---

## Patterns NOT Used (But Could Be Borrowed)

1. **Redux/Zustand** - Too heavy for UI-only state
2. **React Query/SWR** - Intents + prefetch handle caching
3. **Redux Middleware** - No thunks needed; intents are the middleware
4. **Global Context for Data** - Only UI state in context
5. **localStorage** - Web client is stateless; no persistence
6. **Third-party Router** - Custom intent-based routing

---

## Lessons for Your Codebase

1. **Lightweight stores** - Don't add Redux if you only have 3 stores
2. **DI at bootstrap** - Single place to wire up dependencies
3. **Intents for async** - Separate data-fetching logic from UI updates
4. **Context for hierarchical state** - Prop drilling is worse than context
5. **SSR considerations** - Check `typeof window` before creating global state
6. **WeakMap for component-scoped config** - Cleaner than pass-through props
7. **Service wrappers** - Wrap browser APIs (fetch, storage) for testability

