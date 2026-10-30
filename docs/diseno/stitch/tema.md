<!-- Exportado de Stitch: sistema de diseño "Intelligent Biomechanical Athletic System" (assets/7a3722fa22a14f45a60efc7376b2a8c7). Texto original de Stitch, sin editar. -->

---
name: Intelligent Biomechanical Athletic System
colors:
  surface: '#0d1419'
  surface-dim: '#0d1419'
  surface-bright: '#263640'
  surface-container-lowest: '#080f14'
  surface-container-low: '#0C151C'
  surface-container: '#192026'
  surface-container-high: '#242b30'
  surface-container-highest: '#2f363b'
  on-surface: '#dce3eb'
  on-surface-variant: '#b9cac5'
  inverse-surface: '#dce3eb'
  inverse-on-surface: '#2a3137'
  outline: '#84948f'
  outline-variant: '#3b4a46'
  surface-tint: '#00dfc3'
  primary: '#70ffe4'
  on-primary: '#00382f'
  primary-container: '#00e5c8'
  on-primary-container: '#006154'
  inverse-primary: '#006b5c'
  secondary: '#59dbc7'
  on-secondary: '#003731'
  secondary-container: '#00a694'
  on-secondary-container: '#00332c'
  tertiary: '#d7eaff'
  on-tertiary: '#1f3243'
  tertiary-container: '#bacee4'
  on-tertiary-container: '#45586b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#41fcde'
  primary-fixed-dim: '#00dfc3'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005045'
  secondary-fixed: '#79f7e3'
  secondary-fixed-dim: '#59dbc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#d0e5fb'
  tertiary-fixed-dim: '#b4c9df'
  on-tertiary-fixed: '#081d2e'
  on-tertiary-fixed-variant: '#35495b'
  background: '#0d1419'
  on-background: '#dce3eb'
  surface-variant: '#2f363b'
  slate-surface: '#1E2C3A'
  deep-card-surface: '#101A22'
  ice-white: '#EBEEF2'
  border-hairline: '#263640'
  status-success: '#22C997'
  status-warning: '#F5B942'
  status-error: '#FF5C69'
typography:
  display-hero:
    fontFamily: Montserrat
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg:
    fontFamily: Montserrat
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  metric-stat-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  metric-stat-md:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-performance, engineering-first mobile environment tailored specifically for native Android platforms. It draws aesthetic and philosophical inspiration from elite telemetry and developer tools—synthesizing the disciplined dark minimalism of Linear with the precision bio-metrics of WHOOP and Apple Fitness. 

The core visual signature balances austere, battery-efficient dark surfaces with bioluminescent cyan telemetry accents. It rejects decorative skeuomorphism, unnecessary drop shadows, and ornamental graphics in favor of surgical clarity, high tonal contrast, and real-time biomechanical feedback. The system is architected for athletes whose cognitive and physical bandwidth is pushed to peak capacity; every visual affordance communicates instant state awareness, movement kinematics, and objective performance truth.

Key personality attributes:
- **Surgical & Authoritative:** Interfaces act as diagnostic instrumentation rather than casual tracking sheets.
- **Bioluminescent High-Contrast:** Vivid signals burst forth from pure OLED depths, ensuring full legibility from 2 to 3 meters away during active sets.
- **Restrained & Intentional:** Color is reserved strictly for interactive affordances and physiological validation. Uncalibrated states remain neutral until verified.

## Colors

The color architecture is built exclusively for native Android dark mode. It centers on an OLED power-saving foundation while providing extreme contrast ratios for dynamic movement telemetry.

### Tonal Architecture
- **Midnight (`#080F14`):** Canvas root and lowest spatial background. Eliminates peripheral glare and maximizes perceived edge acuity.
- **Deep Card Surface (`#101A22`):** Primary elevated surface tier for modular metric widgets, exercise cards, and grouped task containers.
- **Slate Surface (`#1E2C3A`):** Secondary container surface dedicated to docked bottom bars, modal sheets, and system toolbars.
- **Border Hairline (`#263640`):** Crisp 1px structural boundary defining components without spatial shadow bleed.

### Telemetry & Accents
- **Electric Teal (`#00E5C8`):** The primary kinetic signal. Reserved for active joint vector overlays, primary call-to-actions, live telemetry counts, and active navigation indicators. Primary interactive buttons set on Electric Teal always use Midnight (`#080F14`) typography for maximum readability.
- **Deep Teal (`#00A896`):** Secondary brand tier for comparative analytics, historical trend lines, and secondary visual states.
- **Ice White (`#EBEEF2`):** Primary foreground text and high-contrast counters, providing a minimum 15.8:1 contrast ratio against the Midnight base.
- **Muted Slate (`#8FA3B8`):** Secondary meta-information, technical metric units (`reps`, `bpm`, `°`, `XP`), and inactive structural icons.

### Semantic Telemetry Logic
- **Success (`#22C997`):** Flawless form execution (Clean Reps $\ge$ 80%), target achievement, and stable tracking locks.
- **Warning (`#F5B942`):** Kinematic deviation requiring immediate correction ("Alinea rodillas", "Baja un poco más") or streak expiration notices.
- **Error (`#FF5C69`):** Dangerous movement patterns, ballistic rep speeds ($<0.8$s), or system disconnects.
- **Neutral / Occluded (`#8FA3B8`):** When vision confidence falls below $0.65$, all color states disengage into neutral outlines to prevent inaccurate biomechanical grading.

## Typography

The typographic hierarchy pairs the geometric power of **Montserrat** with the functional, clinical legibility of **Inter**.

### Roles & Execution
1. **Montserrat (Display & Performance Numerals):** Utilized for workout timers, dynamic HUD rep counts, and screen anchors. The tight negative tracking (`-0.02em` to `-0.03em`) on heavy weights (`700` and `800`) creates a dense, muscular presence designed to cut through blurred vision and physical exertion.
2. **Inter (Interface & Telemetry Data):** Serves all contextual reading levels, metric units, dynamic guidance tooltips, and table configurations. High x-height ensures immediate decipherability at small scale.

### Ergonomic Rules
- **At-a-Distance Telemetry:** During active camera-tracked exercises, rep counters must utilize `display-hero` or `display-lg`. Micro-copy is forbidden during active sets.
- **Numerical Unit Coupling:** Performance figures rendered in Montserrat must bind directly to their units (e.g., `kg`, `reps`, `bpm`) set in Inter Muted Slate with a strict 4px spacing interval and aligned on the visual baseline.
- **Coaching Phrasing:** Live feedback cues must never exceed 4 words in Spanish (e.g., "Mantén el pecho arriba", "Profundiza la flexión").

## Layout & Spacing

The layout is grounded on a strict 4px/8px modular rhythm engineered for native Android viewports, respecting system status bars, display cutouts, and bottom navigation gesture handles.

### Mobile Grid & Margins
- **Canvas Margins:** Fixed at 16px (`1rem`) on standard smartphones ($360\text{dp} - 430\text{dp}$), expanding to 24px (`1.5rem`) on foldable devices and tablets.
- **Vertical Rhythm:** Modular components adhere to a 12px gap between adjacent cards and a 24px gap between functional content sections.
- **Safe Zone Allocation:** In live camera workouts, the central 70% of the viewport remains strictly transparent and unencumbered by opaque panels, allowing uninterrupted visual tracking of human pose landmarks.

### Touch Targets
All interactive targets maintain a mandatory minimum touch box of $48 \times 48\text{dp}$, exceeding standard tap requirements to ensure reliability for users with sweat-slicked fingers or dynamic movement.

## Elevation & Depth

Visual depth is achieved through an authentic dark-mode tiered surface model rather than artificial drop shadows, maximizing contrast against pure black OLED panels.

### Surface Tiers
1. **Tier 0 (Root Canvas):** Midnight (`#080F14`) — Represents absolute foundation.
2. **Tier 1 (Resting Cards):** Deep Card Surface (`#101A22`) + 1px hairline border (`#263640`).
3. **Tier 2 (Docked Bars & Sheets):** Slate Surface (`#1E2C3A`) + 1px hairline border (`#263640`).
4. **Tier 3 (Active HUD Badges):** Semi-translucent Slate (`rgba(30, 44, 58, 0.85)`) with an integrated backdrop blur of 12px, suspended directly over camera viewports.

### Outlines and Borders
Drop shadows with blurred radii are prohibited. Edge separation is maintained entirely via a precise 1px solid stroke using the `Border Hairline` token (`#263640`). Focused or active states transition this 1px stroke into pure `Electric Teal` (`#00E5C8`) with zero glow distortion.

## Shapes

The design uses a clean geometry that conveys mechanical and athletic precision. Overly round, bubbly shapes are avoided to keep the interface looking technical rather than casual.

### Corner Radii
- **Interactive Controls (Buttons, Inputs, Selectors):** `12px` border radius. Delivers a tactile, engineered feel while keeping distinct boundary definitions.
- **Cards & Data Modules:** `16px` border radius. Encapsulates structured information with cohesive outer contours.
- **Micro Badges & Stat Chips:** `4px` to `8px` corner radius for metric labels and technical difficulty tags.
- **Floating HUD Guidance Pills:** Fully rounded / capsule (`9999px`) to visually differentiate ephemeral feedback from persistent screen structure.

## Components

### Buttons
- **Primary Action (CTA):**
  - Background: Solid Electric Teal (`#00E5C8`).
  - Text: Montserrat 700 / Inter 600 in Midnight (`#080F14`).
  - Height: Fixed 52px for primary screen triggers; border-radius 12px.
  - Interaction: 0.98x scale compression and 90% opacity on press.
- **Secondary Action:**
  - Background: Slate Surface (`#1E2C3A`) or Transparent.
  - Border: 1px hairline Border (`#263640`).
  - Text: Ice White (`#EBEEF2`).
  - Height: 48px; border-radius 12px.
- **Ghost Utility Button:**
  - Background: Transparent; zero border.
  - Text: Muted Slate (`#8FA3B8`), switching to Electric Teal upon interaction.

### Modular Cards
- **Structure:** Deep Card Surface (`#101A22`) with 16px corner radius and 1px Border (`#263640`).
- **Internal Padding:** 16px standard; 20px on hero workout launchers.
- **Data Pairing:** Metric readouts group a large Montserrat figure directly above or alongside its Inter regular descriptor.

### Bottom Navigation Bar (Android Native)
- **Container:** Docked Slate Surface (`#1E2C3A`) with a single top border in `#263640` and system navigation bar insets.
- **Destinations (4 Tabs):**
  1. *Hoy* (Daily routine, streak indicator, immediate actions).
  2. *Progreso* (Analytics, historical calendar, volume load).
  3. *Misiones* (Gamified daily quests and XP milestones).
  4. *Perfil* (Biometrics, preferences, device integrations).
- **Tab State:** Active tab shows Electric Teal (`#00E5C8`) icon and label; inactive tabs render in Muted Slate (`#8FA3B8`).

### Real-Time Biomechanical HUD (Computer Vision Engine)
- **Landmark Render:** 33-point skeletal landmark vector paths rendered in 2px Electric Teal stroke with 45% default opacity, transitioning to 100% full luminance upon optimal execution.
- **Repetition Counter:** Centered Montserrat ExtraBold numerals (`56px`) anchored near the lower third of the screen.
- **Segmented Quality Gauge:** Horizontal segmented bar indicating the ratio of clean reps versus form degradation (`Forma limpia: 82%`).
- **Kinematic Toast Pill:** Anchored beneath the target joint; high-contrast floating pill showing state glyph alongside short corrective prompts (e.g., Amber Warning with "Alinea rodillas").

### Form Fields & Inputs
- **Field Base:** Deep Card Surface (`#101A22`), 48px height, 12px radius, and 1px border (`#263640`).
- **Text:** Values rendered in Ice White (`#EBEEF2`); placeholder in Muted Slate (`#8FA3B8`).
- **Active State:** Border transitions cleanly to Electric Teal (`#00E5C8`).
