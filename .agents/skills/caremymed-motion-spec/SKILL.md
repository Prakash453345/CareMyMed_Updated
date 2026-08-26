---
name: caremymed-design-doctrine
description: Master Product, Visual Grammar, and Motion Doctrine for CareMyMed. Enforces rich organized information density, 100% feature preservation, Swiggy-level compositional cohesion, and tactile motion engineering.
---

# CareMyMed Master Design & Engineering Doctrine

**Scope**: Universal product design, visual grammar, compositional hierarchy, and motion engineering standards for CareMyMed (`users-mobile`).

> [!IMPORTANT]
> **The Core Directive: Organized Density Over False Minimalism**
> CareMyMed is a feature-rich, high-trust healthcare companion.
> **The goal is NEVER minimalism, fewer cards, or deleting features to create whitespace.**
> The goal is: **Rich Functionality + Organized Information Density + Unified Visual Grammar + Contextual Hierarchy + Tactile Motion.**

---

## 1. The Inviolable Product & Architectural Guardrails

### Rule 1: Zero Feature Deletion (Preserve 100% of Capabilities)
* **Never remove, collapse, or discard existing patient-facing functionality merely to achieve visual simplicity.**
* Every existing feature—including sparklines, Apple Health-style vitals telemetry, progressive medication cards, supply tracking, multi-accent timeline slots, streak companions, next-action engines, mood logging, sleep estimates, turn-by-turn alerts, celebration states, and bottom sheets—**must be preserved**.
* When redesigning or refactoring any screen:
  1. **Inventory** all existing functions, interactive states, and metadata fields.
  2. **Preserve** every single capability and its store hooks/callbacks.
  3. **Regroup** them into a clearer, more readable visual hierarchy.
  4. **Standardize** their visual grammar (tokens, typography, elevation, borders).
  5. **Apply motion** to reinforce that hierarchy.

### Rule 2: The Real Lesson from Reference Apps (e.g. Swiggy)
* Reference apps like Swiggy, Apple Health, or modern fintech do **not** have fewer features. They have *more* (search, banners, delivery tracking, category rows, restaurant cards, filters, discount badges, personalized recommendations).
* They feel premium because **many disparate capabilities are governed by one unified visual grammar**.
* Use reference apps for **compositional consistency, spatial rhythm, and interaction continuity**—never as an excuse to reduce functional density.

### Rule 3: Avoid "Card Soup" (Different Things, Same Family)
* **Not every module needs to be a standard card.** Putting 10 identical white rounded rectangles on a screen destroys visual hierarchy and personality.
* Distinct functions should have distinct visual treatments (e.g., metric sparkline boxes, inline time-slot rows, full-width glanceable chips, ambient hero surfaces, floating action triggers) while sharing the same underlying DNA:
  * Same 4-tier radius scale (`20px` card, `16px` sheet/box, `12px/8px` controls/chips, `9999px` pills).
  * Same typography hierarchy (`PlusJakartaSans` for headings/branding, `Inter` for tabular numbers/vitals).
  * Same tokenized color semantics (warm `#FAFAF9` canvas, `#FFFFFF` surfaces, `#7C3AED` brand purple).
  * Same $48\times 48\text{dp}$ touch target floor.

### Rule 4: Contextual Header ("The Product Moment")
* The header must not be a static, generic label. It is the active pulse of the app:
  * Patient greeting (*"Good evening, Puneeth 👋"*).
  * Date and contextual status chip (*"4 medications · 2 vitals due"* or *"● Health is stable"*).
  * Unread notification badge & profile avatar.

---

## 2. Visual Grammar & Design Tokens

Every component in CareMyMed must inherit from `src/theme/`:

### 2.1 Surfaces & Canvas
* `canvas`: Strictly `#FAFAF9` (warm canvas separating CareMyMed from sterile medical looks).
* `surface`: `#FFFFFF` (crisp white primary containers).
* `surfaceSecondary`: `#F8FAFC` (subtle secondary backgrounds for metric tiles and input wells).
* `surfaceMuted`: `#F1F5F9` (track backgrounds, dividers, inactive states).

### 2.2 Typography Tokens (`TYPOGRAPHY`)
* **Headers & Brand**: `PlusJakartaSans_700Bold`, `PlusJakartaSans_600SemiBold`.
* **Telemetry & Numeric Values**: `Inter_700Bold`, `Inter_800ExtraBold` (tabular figures for Heart Rate, Blood Pressure, Glucose, Health Score).
* **Body & Secondary Copy**: `PlusJakartaSans_400Regular`, `PlusJakartaSans_500Medium`.
* **Text Colors**: `text.primary` (`#111827`), `text.secondary` (`#64748B`), `text.muted` (`#94A3B8`), `text.inverse` (`#FFFFFF`).

### 2.3 Elevation Hierarchy
* `elevation.card`: Subtle soft card shadow for at-rest containers.
* `elevation.cardElevated`: Accentuated shadow for active hero cards.
* `elevation.floating`: Floating action buttons (`ChatFAB`).
* `elevation.modal`: Bottom sheets, popovers, custom floating tab bar.

---

## 3. Motion & Interaction Doctrine

Motion is the kinetic layer that reinforces hierarchy, builds trust, and makes the dense interface feel effortless.

### 3.1 Branded Launch Sequence (4-Beat Orchestration)
1. **Beat 1 (0–400ms)**: Solid brand purple canvas (`#7C3AED`) full-bleed.
2. **Beat 2 (400–1100ms)**: Logo mark scales in ($0.88 \rightarrow 1.0$) and fades in ($0 \rightarrow 1.0$) with soft radial halo glow.
3. **Beat 3 (1100–1900ms)**: Contextual session sync copy (*"Syncing your care plan…"* / *"Setting things up…"*) appears beneath the logo.
4. **Beat 4 (1900ms $\rightarrow$)**: 200ms ease-out cross-fade directly into mounted app chrome.
5. **Anti-flicker floor**: Launch sequence must never resolve in under 1.9s on cold boot.

### 3.2 Instant Chrome, Progressive Content Loading
* **Frame 1**: App chrome (status bar, orientation header, tab bar, section titles, card structural frames) mounts synchronously with real geometry.
* **Content**: Dynamic data loads into **content-shaped in-place skeletons**:
  * `RingSkeleton` for circular health rings.
  * `MedRowSkeleton` for stacked medication slots (44×44 icon box + text lines + pill count badge).
  * `VitalsCardSkeleton` for 2-box metric grids with sparkline wells.
  * `PillCardSkeleton` for chips and badges.
* **Zero Layout Shift**: Structural boundaries must not jump or resize when data arrives.
* **No Plausible Mock Telemetry**: Dashboard vitals during empty state must show an honest `—` ("Not recorded yet"), never fake numbers like `72 bpm` or `120/80` that mimic real readings.

### 3.3 Tactile Micro-Interactions & Physics
* **Card Press**: `scale(0.97)` on `onPressIn`, spring recovery on `onPressOut` (mass: 1, tension: 280, friction: 20).
* **1-Tap Actions**: Trigger immediate optimistic UI updates + `HapticPatterns.selection()` / `HapticPatterns.allDone()`.
* **Tab Bar**: 150ms sliding pill indicator transitioning between active tabs.
* **Accessibility**: Every shimmer and continuous animation must check `useReducedMotion` and fall back to static muted fills.

---

## 4. Screen Execution Checklist

Before modifying any screen, verify:
- [ ] **Feature Inventory**: Are all original components, telemetry metrics, and actions accounted for?
- [ ] **Visual Cohesion**: Does every module consume tokens from `src/theme/` (colors, text, radius, elevation)?
- [ ] **Organized Density**: Is information rich, compact, and scannable without degenerating into generic "card soup"?
- [ ] **Honest Telemetry**: Are empty states clearly marked as `—` rather than displaying plausible placeholder numbers?
- [ ] **Tactile Feedback**: Are all pressable targets $\ge 48\times 48\text{dp}$ with appropriate haptics and spring animations?
- [ ] **Accessibility**: Does the layout support dynamic text sizes and respect `useReducedMotion`?
