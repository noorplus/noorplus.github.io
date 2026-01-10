# Onboarding UI Mockup Implementation Guide

## Visual Reference & Implementation Details

### STEP 1: Your Location & Prayer Calculation

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│              🌍 Globe SVG (120x120)                   │
│                                                       │
│         Your Location (Title)                        │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Current Location                                 │ │
│  │ QCRR+CJ8, Dhaka, Dhaka Division, Bangladesh    │ │
│  │ Time Zone: Asia/Dhaka                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Prayer Time Calculation                             │
│  Select your preferred calculation method...         │
│                                                       │
│  ┌─ Calculation Method ───────────────────────────┐ │
│  │ Karachi                            ▼           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Asr Calculation ──────────────────────────────┐ │
│  │ Hanafi                             ▼           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ✓ The calculation method is set automatically... │ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │     See Country & Method List                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │           ► Continue                           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
└─────────────────────────────────────────────────────┘
Progress: ●   ○   ○   (Step 1 of 3)
```

**SVG Globe Details:**
- **Color Scheme:** Green (#4a9d6f) + Gold (#f4d856) + Black
- **Dimensions:** 120x120px viewBox
- **Components:** Circle background, curved continents, location pin
- **Style:** Modern, minimalist, professional

**Interactive Elements:**
- Location address updates from geolocation API
- Timezone auto-detected from browser settings
- Dropdown buttons show hidden select elements when clicked
- Selected values display in button text

---

### STEP 2: Choose Preferred Language

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│                  🇧🇩 Flag SVG (100x100)              │
│                                                       │
│         Choose preferred language                    │
│   (Color: Primary - usually blue)                    │
│                                                       │
│  Deen app comes with both English and Bangla      │
│  language. Choose your preferred language to      │
│  continue.                                          │
│                                                       │
│         ┌──────────────────────────────────────┐    │
│         │ English  |  Bangla                    │    │
│         │  (white) | (white when selected)     │    │
│         │          [background: black]         │    │
│         └──────────────────────────────────────┘    │
│         (Toggle Switch - Radio button backend)      │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │           ► Continue                           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
└─────────────────────────────────────────────────────┘
Progress: ●   ●   ○   (Step 2 of 3)
```

**SVG Flag Details:**
- **Bangladesh Flag:** Green background (#1aa260) with red circle (#e21e1e)
- **Pole:** Gray/brown vertical line
- **Dimensions:** 100x100px viewBox
- **Style:** Stylized, recognizable, professional

**Toggle Switch Styling:**
- **Background:** Pure black (#000)
- **Options:** White text labels (English, Bangla)
- **Active State:** White background on selected option
- **Padding:** 4px between options
- **Transitions:** Smooth color transitions on selection
- **Behavior:** Radio button (single selection, mutually exclusive)

---

### STEP 3: Adjust Hijri Date

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│         🚀 Space/Planets SVG (120x120)               │
│        (Sun, Earth, Saturn, Rocket, Stars)          │
│                                                       │
│         Adjust Hijri Date                           │
│                                                       │
│  Some countries (Bangladesh, India, Pakistan and   │
│  other South Asian countries) are 1 day behind     │
│  from Saudi Arabia in terms of moon sighting.      │
│  You may adjust Hijri date by your location or     │
│  keep it as same as Saudi Arabia.                  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ◄━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━► │ │
│  │ -2    -1     0      +1      +2                  │ │
│  └─────────────────────────────────────────────────┘ │
│  (Black-to-white gradient background)               │
│                                                       │
│  Same day as Saudi Arabia                           │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │           ► Continue                           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
└─────────────────────────────────────────────────────┘
Progress: ●   ●   ●   (Step 3 of 3)
```

**SVG Space Illustration Details:**
- **Background:** Dark blue circle (#3d5a80)
- **Sun:** Yellow (#ffc107) - 32px radius
- **Earth:** Green (#4caf50) - 16px radius with mountain peak
- **Saturn:** Brown (#cd853f) - 18px radius with rings
- **Rocket:** Red (#ff5722) and grey - positioned in corner
- **Stars:** White dots of varying opacity scattered around
- **Dimensions:** 120x120px viewBox
- **Style:** Playful, astronomical, engaging

**Slider Styling:**
- **Gradient Track:** Linear gradient from black (left) to white (right)
- **Thumb:** 36px white circle with 2px black border
- **Range:** -2 to +2 with step of 1
- **Default:** 0 (same as Saudi Arabia)
- **Labels:** 5 labels below slider (-2, -1, 0, +1, +2)
- **Label Styling:** Center-aligned, 0 highlighted in bold and color
- **Responsive:** Full width, scales with container

---

## Color Palette

### Primary Colors:
- **Primary Blue:** `var(--primary)` (usually #2e7e9d or similar)
- **Success Green:** #4caf50 (earth, location indicator)
- **Dark Green:** #4a9d6f (globe, Bangladesh flag)
- **Gold:** #f4d856 (continent outlines)
- **Red:** #e21e1e (Bangladesh flag circle)

### Neutral Colors:
- **Black:** #000 (toggle background, text)
- **White:** #fff (toggle selected, slider thumb)
- **Gray:** Various shades for dividers and secondary text
- **Light Gray:** #f0f0f0 (button backgrounds)

### Status/Info:
- **Success Green:** #4caf50 (info text in Step 1)
- **Text Primary:** `var(--text-primary)` (main text)
- **Text Secondary:** `var(--text-secondary)` (helper text)

---

## Typography

### Headings:
- **Step Title:** 24px (var(--font-xl)), Bold (700), Centered
- **Section Title:** 18px, Medium Weight (600)
- **Card Header:** 16px, Semibold (600)

### Body Text:
- **Description:** 14px, Regular (400), Centered, 1.6 line-height
- **Helper Text:** 13-14px, Light (400), Secondary color
- **Button Text:** 14px, Regular (400), Center-aligned
- **Labels:** 12px (var(--font-sm)), Uppercase, Letter-spacing 0.5px

---

## Spacing & Layout

### Padding/Margins:
- **Container:** Large spacing (var(--space-lg) = typically 24px)
- **Control Groups:** Medium spacing (var(--space-md) = typically 16px)
- **Illustration Top:** Extra-large (var(--space-2xl) = typically 32px)
- **Buttons:** Bottom margin 32px (step navigation)

### Border Radius:
- **Main Elements:** Consistent (var(--radius-md) = typically 8px)
- **Buttons:** Same radius as inputs
- **Cards:** Same radius as inputs
- **Toggle Switch:** Slightly reduced (radius - 2px)

### Gap/Gaps Between Elements:
- **Main Gap:** var(--space-lg) = 24px (between sections)
- **Small Gap:** var(--space-sm) = 8px (between options)
- **Icon/Text Gap:** 8px (in buttons)

---

## Animation Details

### Fade In Animation:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
- **Duration:** 0.4s
- **Easing:** ease-out
- **Applied to:** Each step on display

### State Transitions:
- **Button Hover:** Border color change, background shift
- **Toggle Selection:** Color transition (smooth 0.2-0.3s)
- **Slider:** Smooth range input interaction
- **All Transitions:** `var(--transition-normal)` (typically 0.2-0.3s)

---

## Implementation Checklist

### HTML Structure:
- ✅ Step containers with data-step attributes
- ✅ Unique IDs for all interactive elements
- ✅ SVG illustrations inline (no external files)
- ✅ Hidden select elements for dropdowns
- ✅ Radio inputs for language toggle
- ✅ Range input for hijri slider
- ✅ Progress indicator (dots + step counter)

### CSS Styling:
- ✅ Custom properties for colors/sizes
- ✅ Flexbox layouts for responsive design
- ✅ Gradient backgrounds where needed
- ✅ Smooth transitions on interactions
- ✅ Mobile-first responsive design
- ✅ Proper Z-index management

### JavaScript Functionality:
- ✅ Auto-location detection on load
- ✅ Location display population
- ✅ Dropdown button handlers
- ✅ Toggle switch selection tracking
- ✅ Slider value updates
- ✅ Step navigation (forward/backward)
- ✅ localStorage persistence
- ✅ Form validation

### Browser Support:
- ✅ Chrome/Edge (modern sliders visible)
- ✅ Firefox (custom slider styling)
- ✅ Safari (works with webkit prefixes)
- ✅ Mobile browsers (full responsiveness)

---

## Notes for Customization

### To Change Colors:
1. Update SVG fill attributes in HTML
2. Modify CSS custom properties in style.css
3. Update gradient colors in slider CSS

### To Change Layout:
1. Adjust padding/margins via CSS variables
2. Modify flexbox properties
3. Update media queries for mobile

### To Change Text:
1. Update text content in HTML steps
2. Modify placeholder texts
3. Update helper/info text messages

### To Add Features:
1. Add event listeners in OnboardingSystem class
2. Update localStorage keys as needed
3. Modify data structure in constructor
4. Add validation rules in validateStepX methods

---

## Production Checklist

Before deploying to production:

- ✅ Test all three steps end-to-end
- ✅ Verify location detection works
- ✅ Check dropdown button functionality
- ✅ Test toggle switch selection
- ✅ Verify slider range (-2 to +2)
- ✅ Confirm localStorage persistence
- ✅ Test on mobile (320px - 480px)
- ✅ Test on tablet (768px - 1024px)
- ✅ Test on desktop (1200px+)
- ✅ Check browser console for errors
- ✅ Verify all SVGs render correctly
- ✅ Test with JavaScript disabled (graceful degradation)
- ✅ Test with slow network (throttling simulation)
- ✅ Check accessibility (keyboard navigation, ARIA labels)
