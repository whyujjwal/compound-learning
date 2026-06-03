# Design System And CSS Cleanup Plan

## Goal

Turn the current large global stylesheet into a maintainable design system with clear layers,
consistent primitives, and polished responsive behavior.

## Current Problems

- `frontend/app/globals.css` is over 7,600 lines.
- Tokens, reset, shell layout, page-specific styles, and component styles live together.
- UI primitives are inconsistent across pages.
- Buttons, cards, panels, tabs, and forms are implemented with many local class variants.
- Some UI still exposes text-heavy controls where icons or structured controls would be clearer.

## Target CSS Structure

```text
frontend/styles/
  tokens.css
  reset.css
  base.css
  layout.css
  typography.css
  primitives/
    button.css
    icon-button.css
    card.css
    field.css
    tabs.css
    drawer.css
    dialog.css
    table.css
    empty-state.css
    toast.css
  features/
    today.css
    library.css
    syllabus-studio.css
    explore.css
    coach.css
    progress.css
    settings.css
```

`frontend/app/globals.css` should become an import file, not the place where all styling lives.

## Visual Direction

Keep the existing "Scholar's Lamp" identity, but make it quieter and more operational:

- Warm dark background.
- Cream foreground.
- Amber/teal accents.
- Low-noise surfaces.
- Dense but readable layout.
- Strong scanning hierarchy.
- No bloated marketing hero sections inside the app.
- Cards only where they represent individual items or tools.
- Page sections should not become nested floating cards.

## UI Primitive Rules

### Buttons

- Use `Button` for text commands.
- Use `IconButton` for common tool actions.
- Use lucide icons for edit, delete, save, add, search, filter, reorder, refresh, close.
- Provide tooltips for unfamiliar icon-only buttons.
- Use consistent sizes: `sm`, `md`, `lg`.
- Destructive buttons require clear color and confirmation for destructive data changes.

### Tabs

- Use tabs for Syllabus detail: Overview, Studio, Map, Materials, Practice, History.
- Tabs must not resize the page header.
- Tabs need mobile wrapping or horizontal scroll.

### Forms

- Use shared `Field`, `Input`, `Textarea`, `Select`.
- Use segmented controls for mode choices.
- Use toggles/checkboxes for binary options.
- Use sliders or number inputs for numeric values.
- Show validation inline and avoid layout shift.

### Cards

- Use cards for repeated syllabus/module/material/proposal items.
- Border radius should stay at 8px or less unless a local pattern requires otherwise.
- Do not nest cards inside cards.
- Do not turn every page section into a card.

### Drawers and dialogs

- Use drawers for material/resource detail editing.
- Use dialogs for confirmations and focused creation flows.
- Keep keyboard focus trapped inside dialogs.
- Escape closes non-destructive dialogs.

## Files Likely Affected

- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/components/ui/*`
- `frontend/components/ThemeToggle.tsx`
- New `frontend/styles/*`
- New primitive components under `frontend/components/ui`
- Feature components under `frontend/features/*`

## Implementation Steps

1. Create `frontend/styles/` folder structure.
2. Move token definitions and theme variables into `tokens.css`.
3. Move reset/base selectors into `reset.css` and `base.css`.
4. Move shell/rail/appbar layout into `layout.css`.
5. Extract primitives one by one: button, card, field, tabs, drawer, toast.
6. Move feature page styles into feature CSS files.
7. Update component class names gradually.
8. Remove duplicated old selectors after each page is migrated.
9. Add visual QA screenshots for each migrated page.

## Design Acceptance Rules

- Text must not overflow buttons, cards, tabs, or sidebars.
- Mobile nav must not obscure primary content.
- Forms must remain usable on narrow screens.
- Syllabus Studio must support dense editing without feeling cramped.
- Empty states must offer a useful next action.
- Loading states must reserve layout space and avoid jumpy UI.
- Focus states must be visible.
- Hover states must not shift layout.

## Edge Cases

- Very long syllabus names.
- Very long material titles.
- Empty modules.
- Material cards with no URL.
- Mobile Studio editor.
- Proposal diff with many operations.
- Dark/light theme transitions.
- Reduced motion preference.

## Tests And Verification

- Run frontend build/typecheck after major CSS moves.
- Use browser screenshots for:
  - Today desktop/mobile
  - Library desktop/mobile
  - Syllabus Studio desktop/mobile
  - Explore desktop/mobile
  - Coach desktop/mobile
  - Settings desktop/mobile
- Check text overflow in longest real syllabus/material titles.
- Check keyboard focus for dialogs/drawers.
- Check reduced motion.

## Acceptance Criteria

- `globals.css` is reduced to imports and truly global rules.
- Primitive styles are reusable and documented by component usage.
- Major feature styles are separated by domain.
- UI controls look consistent across the app.
- Browser screenshots show no incoherent overlap.
- Mobile views remain polished.

## Agent Coordination Notes

- Coordinate with Agent C before renaming classes in active components.
- Coordinate with Agent F for screenshot coverage.
- Avoid unrelated visual redesign during backend or proposal implementation.

