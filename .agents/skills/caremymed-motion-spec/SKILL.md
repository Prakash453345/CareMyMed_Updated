---
name: caremymed-design-doctrine
description: Master Product, Visual Grammar, and Motion Doctrine for CareMyMed. Enforces rich organized information density, 100% feature and behavioral preservation, Swiggy-level contextual composition, and tactile motion engineering.
---

# CareMyMed Master Design & Engineering Doctrine

**Scope**: Universal product design, visual grammar, compositional hierarchy, and motion engineering standards for CareMyMed (`users-mobile`).

> [!IMPORTANT]
> **The Core Directive: Organized Density Over False Minimalism**
> CareMyMed is a feature-rich, high-trust healthcare companion.
> **The goal is NEVER minimalism, fewer cards, or deleting features to create whitespace.**
> The goal is: **Rich Functionality + Organized Information Density + Unified Visual Grammar + Contextual Hierarchy + Tactile Motion.**
>
> **Source-of-Truth Separation:**
> * **The existing screen** is the content source of truth (**WHAT** exists).
> * **The design system** is the visual source of truth (**HOW** it looks).
> * **The motion doctrine** is the behavioral source of truth (**HOW** it moves).

---

## 1. Architectural & Product Guardrails

### Rule 1: 100% Feature & Behavioral Preservation
* **Never remove, collapse, or discard existing patient-facing functionality merely to achieve visual simplicity.**
* Every existing capability—including sparklines, Apple Health-style vitals telemetry, progressive multi-accent medication cards, supply refill tracking, streak companions, next-action engines, mood logging, sleep estimates, turn-by-turn alerts, celebration states, and bottom sheets—**must be preserved**.
* **Preserve Behavior and Contracts:** You must preserve all existing navigation routes, store selectors, API contracts, callbacks, optimistic updates (`optimisticMarkSlotTaken`, etc.), error handling boundaries (`RecoverableBoundary`), analytics/telemetry events, haptic patterns, and offline persistence/sync pipelines unless explicitly directed otherwise.

### Rule 2: No Silent Simplification
* **Do not remove, hide, merge, or collapse a module, metric, action, metadata field, or interaction because it appears visually redundant.**
* If consolidation seems desirable: **Merge presentation, NEVER capability.** Every underlying data field, tap target, and action must remain accessible and functional.

### Rule 3: Cohesion Does Not Require Uniformity ("Different Things, Same Family")
* **Not every module needs to be a card.** Putting 10 identical white rounded rectangles on a screen creates "card soup" and destroys visual hierarchy.
* A hero signature, telemetry sparkline tile, medication row, timeline event, clinical insight, quick action, and floating assistant may each have **different composition and visual emphasis** while sharing the same underlying design DNA.

### Rule 4: Context-Aware Product Header ("The Swiggy Moment")
* The header is not a static label or a cluttered kitchen sink. It is the **context-aware pulse** of the app.
* It surfaces the most relevant contextual status, pending action, location, or notification state based on the patient's current moment:
  * Patient greeting (*"Good evening, Puneeth 👋"*).
  * Adaptive contextual indicator (*"4 medications · 2 vitals due"* or *"● Health is stable"*).
  * Notification badge & profile avatar.

---

## 2. Information Hierarchy & Visual Grammar

### 2.1 Information Hierarchy Rules
Visual hierarchy must be determined by **user urgency and decision value**, not by component type:
1. **Current Context**: Orientation & active state ("Where am I? What's happening now?").
2. **Urgent Action**: Immediate scheduled doses or critical reminders ("What do I need to do right now?").
3. **Health State**: Overall biological status & daily score ("How am I?").
4. **Important Telemetry**: Vitals readings and trend sparklines.
5. **Progress & Trends**: 35-day streak, adherence consistency, and sleep/activity logs.
6. **Secondary Insights & Education**: AI coach recommendations, daily clinical tips, and educational guides.

> Components at the same hierarchy level must not compete visually. Use contrast, scale, and subtle surface shifts to establish clear primary vs secondary relationships.

### 2.2 Visual Tokens (`src/theme/`)
* **Surfaces & Canvas**:
  * `canvas`: `#FAFAF9` (warm canvas separating CareMyMed from sterile medical looks).
  * `surface`: `#FFFFFF` (crisp white primary containers).
  * `surfaceSecondary`: `#F8FAFC` (secondary backgrounds for metric wells and input fields).
  * `surfaceMuted`: `#F1F5F9` (track backgrounds, dividers, inactive states).
* **5-Tier Radius Hierarchy**:
  * `20px` $\rightarrow$ Primary cards / hero surfaces (`radius.card`)
  * `16px` $\rightarrow$ Secondary surfaces / sheets (`radius.sheet`)
  * `12px` $\rightarrow$ Controls / compact cards (`radius.input` / `radius.button`)
  * `8px`  $\rightarrow$ Small controls / icon containers (`radius.sm`)
  * `9999px` $\rightarrow$ Pills / capsules / avatars (`RADIUS.pill`)
* **Typography Tokens (`TYPOGRAPHY`)**:
  * **Headers & Brand**: `PlusJakartaSans_700Bold`, `PlusJakartaSans_600SemiBold`.
  * **Telemetry & Numeric Values**: `Inter_700Bold`, `Inter_800ExtraBold` (tabular numbers for vitals, health score, doses).
  * **Body & Labels**: `PlusJakartaSans_400Regular`, `PlusJakartaSans_500Medium`.
  * **Text Tokens**: `text.primary` (`#111827`), `text.secondary` (`#64748B`), `text.muted` (`#94A3B8`), `text.inverse` (`#FFFFFF`).
* **Cross-Platform Elevation**:
  * `elevation.card`: Standard card resting elevation.
  * `elevation.cardElevated`: Primary hero card elevation.
  * `elevation.floating`: Floating action buttons (`ChatFAB`).
  * `elevation.modal`: Bottom sheets, popovers, custom floating tab bar.

---

## 3. Motion & Interaction Doctrine

Motion reinforces existing hierarchy; **it must never manufacture artificial importance**.

### 3.1 Branded Launch Sequence (4-Beat Orchestration)
1. **Beat 1 (0–400ms)**: Solid brand purple canvas (`#7C3AED`) full-bleed.
2. **Beat 2 (400–1100ms)**: Official CareMyMed brand logo (`assets/logo.png`) scales in ($0.85 \rightarrow 1.0$) with soft radial halo glow pulse.
3. **Beat 3 (500–1200ms)**: Top Context Card (active location / health score status) slides down smoothly; dynamic status ticker begins.
4. **Beat 4 (1900ms $\rightarrow$)**: 220ms ease-out cross-fade directly into mounted app chrome.
5. **Anti-Flicker Floor**: Launch sequence must never resolve in under 1.9s on cold boot.

### 3.2 Instant Chrome, Progressive Content Loading
* **Frame 1**: App chrome (status bar, orientation header, tab bar, section titles, container frames) mounts synchronously.
* **Content**: Dynamic data loads into **content-shaped in-place skeletons**:
  * `RingSkeleton` for circular health rings.
  * `MedRowSkeleton` for stacked medication slots (44×44 icon box + text lines + pill badge).
  * `VitalsCardSkeleton` for 2-box metric grids with sparklines.
  * `PillCardSkeleton` for chips and badges.
* **No Plausible Mock Telemetry**: During empty state or loading, vitals must show an honest `—` ("Not recorded"), never fake numbers like `72 bpm` or `120/80` that mimic real readings.

### 3.3 Interaction Physics Calibration
* **Large Cards / Surfaces**: `scale(0.98)` on `onPressIn`, spring recovery on `onPressOut`.
* **Small Controls / Pills / Buttons**: `scale(0.97)` on `onPressIn`, spring recovery on `onPressOut`.
* **1-Tap Actions**: Immediate optimistic UI updates + `HapticPatterns.selection()` / `HapticPatterns.allDone()`.
* **Tab Bar**: 150ms sliding pill indicator transitioning between active tabs.
* **Accessibility**: Every animation and shimmer must check `useReducedMotion` and fall back to static muted fills.

---

## 4. Mandatory Screen Redesign Protocol

Before making changes to any existing screen, follow this 9-step algorithm:

1. **Inventory Existing Modules**: List every visual component, graph, tile, and card on the screen.
2. **Inventory Interactions & Navigation**: Map every tap target, modal trigger, swipe gesture, and route.
3. **Inventory Dynamic Data & State**: Identify all store subscriptions, live telemetry, and edge cases (empty, low-supply, error).
4. **Map Priority Hierarchy**: Categorize items by user urgency (Current Context $\rightarrow$ Urgent Action $\rightarrow$ Health State $\rightarrow$ Telemetry $\rightarrow$ Progress $\rightarrow$ Insights).
5. **Recompose with Visual Grammar**: Apply the canonical tokens, spacing rhythm, and surface treatments without deleting modules.
6. **Preserve All Behaviors & Data**: Ensure store hooks, optimistic updates, and callbacks remain 100% wired.
7. **Apply Hierarchy-Reinforcing Motion**: Add tactile scale springs, skeleton shimmers, and micro-interactions.
8. **Side-by-Side Verification**: Compare old vs new capabilities to guarantee zero loss of information density.
9. **Automated & Manual Tests**: Verify that unit/integration test suites pass with zero regressions.
