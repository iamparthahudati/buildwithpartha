# LifeOS Performance Budgets and Benchmarks Specification & Verification Report

- Status: Accepted
- Date: 2026-09-11
- Ticket: [LOS-1510](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)
- Depends on: [LOS-1509](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/53-APPLICATION-SECURITY-TESTING.md), [LOS-1508](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md), [LOS-1507](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/51-SECURITY-HEADERS-AND-CSP.md)

---

## 1. Executive Summary & Objectives

This specification establishes enforceable performance budgets, latency service level agreements (SLAs), resource utilization boundaries, and automated regression testing across the entire LifeOS stack.

To deliver an ultra-responsive, accessible, and lightweight productivity operating system, LifeOS enforces strict performance thresholds across six key dimensions:

1. **Frontend Asset & Bundle Budgets**: Maximum uncompressed and compressed asset payload sizes, route code-splitting, and vendor isolation.
2. **Core Web Vitals (CWV) & Real-User Monitoring**: Strict thresholds for Largest Contentful Paint (LCP), Interaction to Next Paint (INP), Cumulative Layout Shift (CLS), First Contentful Paint (FCP), and Time to First Byte (TTFB).
3. **Backend API Latency SLAs**: Tiered p95 response time constraints covering health/profile, CRUD operations, and complex multi-domain aggregations.
4. **Database Query Performance**: Execution time limits per query, index coverage verification, N+1 query prevention, and connection pool sizing.
5. **Container & System Resource Budgets**: Memory limits, CPU reservations, and JVM heap configurations for all deployment containers.
6. **Large-Data Volume Scalability**: Sub-second compute and render guarantees under large task counts, extensive habit logs, and historical review data.

---

## 2. Frontend Bundle & Asset Budgets

```
+-----------------------------------------------------------------------------------+
|                        LifeOS Production Bundle Topology                          |
|                                                                                   |
|  [ index.html ] (~1.2 kB)                                                         |
|         |                                                                         |
|         +---> [ vendor-react.js ] (~170 kB)   -- React, React-DOM, React-Router    |
|         +---> [ vendor-query.js ] (~37 kB)    -- TanStack React Query             |
|         +---> [ vendor-icons.js ] (~30 kB)    -- Lucide React Tree-Shaken Icons   |
|         +---> [ index.js ]        (~21 kB)    -- Shell, Theme, State, Routing     |
|         +---> [ index.css ]       (~22 kB)    -- Tailwind Tokens & Base Styles    |
|         |                                                                         |
|         +---> Dynamic Route Chunks (Lazy Loaded on Navigation, <= 50 kB each)     |
|               - TodayRoute.js (~2 kB)                                             |
|               - TasksRoute.js (~13 kB)                                            |
|               - HabitsRoute.js (~11 kB)                                           |
|               - AnalyticsRoute.js (~16 kB)                                        |
|               - ... (30 Total Isolated Route Chunks)                              |
+-----------------------------------------------------------------------------------+
```

### 2.1 Asset Size Thresholds

| Asset Category | Raw Size Budget (Max) | Target Size (Typical) | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Main Entry JS (`index.js`)** | 200 kB | ~21 kB | `verify-bundle-budgets.mjs` & CI Test |
| **Combined Initial JS Payload** | 350 kB | ~258 kB | `verify-bundle-budgets.mjs` & CI Test |
| **Main CSS (`index.css`)** | 50 kB | ~22 kB | `verify-bundle-budgets.mjs` & CI Test |
| **Individual Route Chunk (Per Page)** | 100 kB | ~2 - 25 kB | `verify-bundle-budgets.mjs` & CI Test |
| **Total Build Output (All 30 Routes)**| 1,500 kB | ~540 kB | `verify-bundle-budgets.mjs` & CI Test |

### 2.2 Dynamic Code Splitting Architecture
All 30 application routes are dynamically imported via `src/app/routeLoaders.ts` and wrapped with `React.lazy` and `<Suspense fallback={null}>` in `src/app/AppRouter.tsx`.

1. **Vendor Chunk Isolation**: Configured in `vite.config.ts` via Rollup `manualChunks` to prevent monolithic bundling and optimize long-term HTTP caching:
   - `vendor-icons`: `lucide-react`
   - `vendor-query`: `@tanstack/react-query`
   - `vendor-react`: `react`, `react-dom`, `react-router-dom`
2. **Chunk Optimization Rules**:
   - Substring matching ensures `lucide-react` and `@tanstack` dependencies are partitioned prior to `react` matches.
   - Zero Rollup `chunkSizeWarningLimit` overrides are permitted; all chunks naturally reside below standard 500 kB warnings.

---

## 3. Core Web Vitals & Real-User Monitoring (RUM)

LifeOS defines two tiers of Core Web Vitals targets: **Target (Good)** and **Enforced Budget (Maximum Allowable)**.

| Metric | Target (Good) | Enforced Budget | Description | Monitoring Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | $\le 1500\text{ ms}$ | $\le 2500\text{ ms}$ | Time until largest hero element / dashboard tile renders | `PerformanceObserver('largest-contentful-paint')` |
| **INP** (Interaction to Next Paint) | $\le 100\text{ ms}$ | $\le 200\text{ ms}$ | Latency for user interactions (clicks, keyboard input) | `PerformanceObserver('event')` duration |
| **CLS** (Cumulative Layout Shift) | $\le 0.05$ | $\le 0.10$ | Visual layout stability score during render | `PerformanceObserver('layout-shift')` without recent input |
| **FCP** (First Contentful Paint) | $\le 1000\text{ ms}$ | $\le 1800\text{ ms}$ | Time until first text or canvas pixel is painted | `PerformanceObserver('paint')` |
| **TTFB** (Time to First Byte) | $\le 400\text{ ms}$ | $\le 800\text{ ms}$ | Navigation request to initial HTML response byte | `performance.getEntriesByType('navigation')` |

### 3.1 Frontend Performance Runtime Module
The client module `src/lib/performance.ts` provides real-time metric capture and evaluation:
- `evaluateMetric(name, value)`: Categorizes metric values into `'good'`, `'needs-improvement'`, or `'poor'`.
- `formatMetricValue(name, value)`: Standardizes formatting (milliseconds vs 3-decimal score for CLS).
- `captureNavigationTimings()`: Extracts TTFB, DOM Interactive, and DOM Complete from browser navigation entries.
- `observePerformanceMetrics(callback)`: Registers non-blocking PerformanceObservers to track real user metrics.

---

## 4. Backend API Latency SLAs (p95)

API endpoints are classified into three performance tiers, each with guaranteed 95th-percentile response time limits under standard production load.

```
+-----------------------------------------------------------------------------------+
|                           API Latency Tier Hierarchy                              |
|                                                                                   |
|  [ Tier 1: Fast / Health / Profile ]    --> p95 <= 100 ms (Max ceiling: 500 ms)   |
|    - GET /actuator/health/liveness                                                |
|    - GET /user/profile                                                            |
|                                                                                   |
|  [ Tier 2: Standard CRUD ]              --> p95 <= 250 ms (Max ceiling: 500 ms)   |
|    - GET /tasks, POST /tasks, PATCH /tasks/{id}                                   |
|    - GET /notes, POST /notes                                                      |
|    - GET /habits, POST /habits                                                    |
|                                                                                   |
|  [ Tier 3: Multi-Domain Aggregations ]  --> p95 <= 500 ms (Max ceiling: 1000 ms)  |
|    - GET /habits/streaks, GET /habits/summary                                     |
|    - GET /reviews/weekly, GET /reviews/quarterly                                  |
|    - GET /analytics/dashboard                                                     |
+-----------------------------------------------------------------------------------+
```

### 4.1 SLA Definition Table

| Tier | Category | Example Endpoints | SLA Target (p95) | Max Test Ceiling |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Fast / Health / Auth Profile | `/actuator/health/liveness`, `/user/profile` | $\le 100\text{ ms}$ | $\le 500\text{ ms}$ |
| **Tier 2** | Entity CRUD Operations | `/tasks`, `/notes`, `/habits`, `/projects` | $\le 250\text{ ms}$ | $\le 500\text{ ms}$ |
| **Tier 3** | Aggregations & Analytics | `/habits/summary`, `/reviews`, `/analytics` | $\le 500\text{ ms}$ | $\le 1000\text{ ms}$ |

---

## 5. Database Query Performance & Connection Pool

To maintain sub-250ms API responses, database operations are strictly bounded:

### 5.1 Query Execution Budgets
1. **Single Query Budget**: All indexed read and write queries must execute in $\le 50\text{ ms}$ (95th percentile).
2. **Index Enforcement**:
   - Primary and composite foreign keys (`user_id`, `created_at`, `status`, `target_date`) are indexed.
   - User tenant isolation predicates (`WHERE user_id = ?`) utilize index-backed sequential or bitmap scans.
3. **N+1 Prevention**:
   - Relationship collections are fetched using batch sizes or explicit `JOIN FETCH` directives.
   - Hibernate statistics monitoring validates that list requests execute with $O(1)$ query count rather than $O(N)$.

### 5.2 HikariCP Connection Pool Configuration
Configured in `application.yml`:
- `maximum-pool-size`: 10 connections
- `minimum-idle`: 5 connections
- `connection-timeout`: 30,000 ms
- `idle-timeout`: 600,000 ms
- `max-lifetime`: 1,800,000 ms

---

## 6. Container & Process Resource Allocations

Container resource limits prevent noisy neighbor exhaustion on virtual private servers (VPS):

| Container | CPU Reservation | CPU Limit | Memory Reservation | Memory Limit | JVM / Process Settings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`api`** (Spring Boot) | 0.50 CPU | 1.00 CPU | 512 MB | 1024 MB | `-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC` |
| **`web`** (Nginx Static) | 0.10 CPU | 0.25 CPU | 64 MB | 128 MB | Worker connections: 1024 |
| **`db`** (PostgreSQL 16) | 0.50 CPU | 1.00 CPU | 256 MB | 512 MB | `shared_buffers = 128MB`, `work_mem = 4MB` |
| **`proxy`** (Caddy Edge) | 0.10 CPU | 0.25 CPU | 64 MB | 128 MB | TLS offload, HTTP/2 & HTTP/3 |

---

## 7. Large-Data Volume Scalability Benchmarks

Scalability is validated under high user entity volumes to ensure UI responsiveness and backend throughput do not degrade non-linearly:

1. **Task Volume Benchmark (50+ Active Tasks)**:
   - Batch creation and retrieval of 50 tasks across distinct priorities, statuses, and tags.
   - Benchmark Requirement: Execution duration $\le 1000\text{ ms}$ end-to-end.
2. **Habit Streak & Log Benchmark (100+ Log Entries)**:
   - Aggregation of 100 historical habit log entries and streak calculations.
   - Benchmark Requirement: Calculation duration $\le 1000\text{ ms}$.
3. **Heap Stability Benchmark**:
   - Peak JVM heap utilization remains bounded under successive batch iterations.
   - Benchmark Requirement: Used heap $\le 512\text{ MB}$ during test execution.

---

## 8. Verification & Test Register

The following test suites validate the performance budgets continuously in CI/CD:

| Test ID | Test Name | Scope | Verification File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PERF-01** | Frontend Bundle Budgets | Web Assets | `life-os/apps/web/tests/bundle-budgets.test.mjs` | PASS |
| **PERF-02** | Lazy Route Code Splitting | Web Router | `life-os/apps/web/src/app/AppRoutes.test.tsx` | PASS |
| **PERF-03** | Core Web Vitals Evaluation | Web Runtime | `life-os/apps/web/src/lib/performance.test.ts` | PASS |
| **PERF-04** | Tier 1 Fast SLA (Health) | Backend API | `PerformanceBudgetsIntegrationTests.java#tier1HealthEndpointSla` | PASS |
| **PERF-05** | Tier 1 Fast SLA (Profile) | Backend API | `PerformanceBudgetsIntegrationTests.java#tier1ProfileEndpointSla` | PASS |
| **PERF-06** | Tier 2 CRUD SLA (Tasks) | Backend API | `PerformanceBudgetsIntegrationTests.java#tier2TaskCrudSla` | PASS |
| **PERF-07** | Tier 3 Aggregation SLA (Habits) | Backend API | `PerformanceBudgetsIntegrationTests.java#tier3HabitAggregationSla` | PASS |
| **PERF-08** | Large Task Volume Scalability | Backend API | `PerformanceBudgetsIntegrationTests.java#largeDataTaskVolumeScalability` | PASS |
| **PERF-09** | Large Habit Volume Scalability | Backend API | `PerformanceBudgetsIntegrationTests.java#largeDataHabitStreakScalability` | PASS |
| **PERF-10** | Database & JVM Heap Bounds | Backend API | `PerformanceBudgetsIntegrationTests.java#databaseQueryAndMemoryBounds` | PASS |

---

## 9. Conclusion & Sign-Off

The LifeOS Performance Budgets and Benchmarks specification satisfies all requirements of ticket **LOS-1510**. Bundle verification, route code-splitting, CWV measurement utilities, API SLA assertions, and volume scalability tests are fully automated and enforced.
