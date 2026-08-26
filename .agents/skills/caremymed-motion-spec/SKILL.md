---
name: caremymed-motion-spec
description: Motion, sequencing, skeleton loading, and interaction doctrine for the CareMyMed mobile app. Use when building or styling screens, transitions, skeletons, launch sequences, and navigation.
---

# CareMyMed Motion & Interaction Spec

**Companion to:** CareMyMed Mobile UI/UX Overhaul — Source of Truth Implementation Plan  
**Scope:** Everything that happens *between* states — launch, load, and navigation. The visual token plan covers what a screen looks like at rest; this spec covers what it looks like while becoming that screen.

> [!IMPORTANT]
> **Why this exists**  
> A screen can use every token correctly and still feel amateurish if it pops into existence fully-formed, or if loading states are generic spinners instead of shaped placeholders. The gap between CareMyMed and a reference app like Swiggy is not visual polish at rest — it's the absence of an intentional motion identity. This spec closes that gap.

---

## 1. Branded Launch Sequence

Reference behavior (Swiggy): solid brand-color canvas → logo scales/fades in with a soft radial glow → a purposeful, personalized beat (location detection) rendered on the *same* background → hard cut into app chrome, which is already fully mounted.

Three beats, zero wasted frames, nothing generic.

### 1.1 CareMyMed sequence

```text
Beat 1 (0–400ms):   Solid canvas, brand purple (#7C3AED), full-bleed.
                    No logo yet — this is the color hit, not empty time.

Beat 2 (400–1100ms): Logo mark fades + scales in (0.85 → 1.0 scale, opacity 0 → 1).
                    Soft radial glow (white, 15% opacity, blurred) pulses once behind
                    the mark — reuse the same glow treatment as the HomeScreen hero
                    ring halo (`elevation.floating` tone) so the brand motif is
                    established before the user ever sees a card.

Beat 3 (1100–1900ms): Logo holds, and a session/profile sync beat renders below it —
                    NOT a spinner. Render whichever is true and known at boot:
                      - "Loading your care plan…" (returning patient, session valid)
                      - "Setting things up…" (new profile, first launch)
                    Same typographic treatment as HomeScreen's eyebrow labels
                    (PlusJakartaSans SemiBold, text.inverse, 13px).

Beat 4 (1900ms →):  Cross-fade (200ms) from splash canvas directly into HomeScreen
                    chrome — NOT a route push, no white flash, no blank frame.
                    Chrome must already be laid out and ready before the fade
                    starts (see Section 2) — the fade reveals structure, it
                    does not trigger structure to mount.
```

### 1.2 Hard rules

- Total splash duration: 1.9–2.3s fixed floor, regardless of actual network speed. If auth/session resolves faster, hold Beat 3 to the floor rather than cutting early — a splash that flickers for 200ms on a fast connection reads as broken, not fast (prevents flicker on fast connections).
- If session/profile fetch exceeds ~3.5s, Beat 3's copy may update once ("Almost there…") but the logo and canvas never change — no progress bar, no percentage.
- Never render the elderly-patient-facing app with a loading spinner as the *first* thing the user sees post-splash. The transition target is always either populated HomeScreen chrome or its skeleton state (Section 2) — never a spinner screen.
- This sequence is Phase 3 (Navigation Shell) scope, since it owns the app's entry route.

---

## 2. Skeleton Component Spec — Content-Shaped Loading States

Reference behavior (Swiggy): tabs, search bar, and nav bar render instantly and are already interactive-looking on frame one. Only images and list content skeleton-load, and the skeleton shapes mimic the real content's geometry (rounded avatar circle, text-line bars) — never a generic spinner or blank gray box.

### 2.1 The rule: chrome is instant, content is progressive

**Chrome** (mounts synchronously, before any network response):
- Top app bar (brand badge, bell, avatar)
- Tab bar / bottom nav
- Section labels ("Today's medications", "Vitals", etc.)
- Static card frames (the white 20px-radius container itself)

**Content** (skeleton-loads, replaced in place when data resolves):
- The hero ring's value and label
- Medication row text and pill counts
- Vitals numbers
- Any list drawn from an API response

If a screen's chrome shifts position, resizes, or appears after a delay once data starts arriving, that is a defect regardless of how correct the tokens are. Nothing above the fold should cause a layout shift once first paint happens.

### 2.2 Required skeleton primitives (`src/components/ui/skeletons/`)

Each of these is a shimmering placeholder shaped like the real component it stands in for — not a spinner, not a blank rect.

1. **`RingSkeleton.jsx`**
   - Same diameter as `ProgressRing` at whichever `size` prop is requested (`lg`/`md`/`sm` — see the shared ring component from the visual token plan).
   - Renders the track circle only (no progress arc), with a shimmer sweep animation across the circle.
   - Center holds a muted rounded-rect placeholder (`surfaceMuted`, ~40% of ring diameter) where the value/label pair will land — never renders "0" or "–" as if it were a value, since that risks being misread as real data (see Section 2.4).

2. **`MedRowSkeleton.jsx`**
   - Matches `MedicationRow`'s exact layout: 44×44 rounded icon-chip placeholder, two stacked text-line bars (name-width ~120px, sub-width ~90px), pill-count placeholder on the trailing edge.
   - Renders 2–3 instances stacked with the same divider spacing as the real list, so the card's height doesn't jump when real rows swap in.

3. **`VitalsCardSkeleton.jsx`**
   - Matches the two-box vitals grid exactly: label-bar + value-bar per box, same `surfaceMuted` background as the real empty state.
   - Important: this is visually distinct from the *actual* empty state ("—" + "Not recorded yet today"). Skeleton = "we're fetching," empty state = "we fetched, and there's nothing." Collapsing these into one state is a regression — an elderly user staring at a shimmering box that never resolves because there's genuinely no data yet is worse than either state alone.

4. **`PillCardSkeleton.jsx`**
   - Generic shimmer block matching any pill-shaped card (date/location chips, quick-actions grid) — rounded-full or `radius.card` per instance, sized to match its real counterpart.

### 2.3 Shimmer animation spec

- Direction: left-to-right sweep, 1.2s loop, ease-linear.
- Implementation: `LinearGradient` (from `expo-linear-gradient`, already likely a dependency given the hero gradient) animated via `translateX`, masked to each skeleton shape.
- Respect `useReducedMotion`: when enabled, skip the sweep animation entirely and show a static `surfaceMuted` fill at 60% opacity — never disable the skeleton itself, only the shimmer motion.
- Color: shimmer highlight uses `colors.surface` at 40% opacity over `colors.surfaceMuted` base — do not introduce a new token for this; it should look like a lighter pass over the existing muted surface tone, not a new brand color.

### 2.4 Anti-pattern this section exists to prevent

The current HomeScreen renders vitals inputs with plausible-looking placeholder numbers (72 bpm, 98%, 120/80) that are visually indistinguishable from real data at a glance. A skeleton state must never repeat this mistake in a new form — a shimmering box is unambiguous ("this is loading"), but a shimmering box that resolves into a number-shaped rest state must still resolve into the honest empty state ("—") when there is no data, not a placeholder number. Skeleton and empty state are both "no real data yet"; they must both look like it. Shimmering skeletons (fetching) MUST cleanly resolve into either (a) verified real data OR (b) an explicit honest empty state ("—" / "Not recorded yet today").

---

## 3. Physical Tab & Chip Transitions

Reference behavior (Swiggy): switching tabs slides the underline indicator to the new position (~150ms) rather than teleporting; the tab's content area cross-fades rather than hard-cutting.

### 3.1 Tab bar / segmented control indicator

- Any tab row with an active-state underline or pill background (bottom nav, "ALL / OFFERS / EATRIGHT"-style segmented headers, if introduced) must animate the indicator's position and width using `Animated.timing` or `LayoutAnimation`, 150ms, ease-out.
- The indicator is a single persistent element that moves — never destroy and recreate it per tab.
- Content beneath the tab cross-fades (120ms opacity) rather than instantly swapping, to mask the skeleton-to-content pop described in Section 2.

### 3.2 Filter pills / quick-action chips

- Selecting a filter pill (e.g. a future "Adherence / Reminders / Coach / Profile" quick-actions row, or medication filter chips) animates a background-color transition (120ms) rather than an instant color snap.
- Press feedback: `scale(0.97)` on press-in, spring back on release — already partially specified for `AnimatedCard` in the token plan; extend the same spring config to pill/chip components rather than inventing a second easing curve.

### 3.3 Hard rule

No navigation action (tab switch, chip select, card press) should have zero transition. An instant, un-animated state change is the single fastest way to make a screen feel like a form rather than an app, even when every token is otherwise correct.

---

## 4. Layered Card Depth

Reference behavior (Swiggy): rating badges, discount tags, and delivery-time labels sit directly on top of the photo with a scrim gradient for legibility — not stacked as plain text below the image.

### 4.1 Application to CareMyMed

CareMyMed's cards are mostly text/icon-driven rather than photo-driven, so this principle translates as: **status and metadata badges anchor to the element they describe, not to a separate line beneath it.**

Concrete corrections against the current HomeScreen:
- The medication pill count ("51 left") already does this correctly — keep it as the reference pattern.
- The adherence "0% Behind" / "Needs attention" label should render as a badge anchored to the ring itself (inside or immediately adjacent, using the ring's own tone color), not as free-floating text stacked below the ring with its own independent color logic. This is the same fix as the amber-ring unification already agreed for the visual plan — this section just states the underlying principle so future badges follow it by default.
- Any future card introducing an image (e.g. a caretaker's photo on `MyCallerScreen`) must apply a bottom scrim gradient (`rgba(15,23,42,0) → rgba(15,23,42,0.55)`) before placing white text over it — never place white text on an unprocessed photo.

---

## 5. Phased Integration

This spec slots into the existing roadmap without adding new phases:

| Phase | Addition from this spec |
|---|---|
| **Phase 2 — Shared UI Primitives** | Build the four skeleton components (2.2), extend `AnimatedCard` press-spring to pills/chips (3.2) |
| **Phase 3 — Navigation Shell & Layout** | Implement the branded launch sequence (Section 1); implement tab-indicator animation (3.1) |
| **Phase 4 — Home Screen Benchmark** | Wire HomeScreen's ring, medication list, and vitals card to their skeleton counterparts for the progressive-load pattern (2.1); apply badge-anchoring correction (4.1) |
| **Phase 6 — Motion Polish & Audit** | Verify: zero layout shift on cold load (2.1), shimmer respects `useReducedMotion` (2.3), splash floor timing holds across network conditions (1.2), tab transitions measured at ~150ms across devices |

---

## 6. Verification Checklist

- [ ] Cold launch: splash never resolves in under 1.9s even on a fast connection
- [ ] Cold launch: HomeScreen chrome (top bar, tabs, section labels) is present in the very first frame after splash — nothing above the fold shifts position after first paint
- [ ] Hero ring shows `RingSkeleton`, never a blank space or spinner, while health score is being fetched
- [ ] Vitals card in skeleton state is visually distinct from vitals card in empty state
- [ ] Every skeleton shimmer respects `useReducedMotion` by falling back to a static muted fill
- [ ] Tab bar indicator animates position on every switch — no instant teleport
- [ ] No placeholder value anywhere in the app is a plausible-looking number (see Section 2.4) — only "—", a shimmer, or explicit empty-state copy
