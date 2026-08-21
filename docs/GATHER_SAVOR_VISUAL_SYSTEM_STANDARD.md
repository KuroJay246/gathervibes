# Gather & Savor Visual System Standard

Date: 2026-08

## Direction

Gather & Savor Event Hub should feel warm, calm, professional, event-neutral, and easy to scan. It must support different event types without becoming Cake Piknik-specific, baker-specific, or a long-form planning notebook.

## Core Tokens

Use `src/styles.css` `--gsv-*` tokens as the shared foundation:

- Background: `--gsv-color-bg`, `--gsv-color-bg-soft`
- Surfaces: `--gsv-color-surface`, `--gsv-color-surface-raised`
- Text: `--gsv-color-text`, `--gsv-color-text-secondary`, `--gsv-color-text-muted`
- Borders: `--gsv-color-border`, `--gsv-color-border-strong`
- Actions: `--gsv-color-primary`, `--gsv-color-primary-strong`
- Statuses: success, warning, error, and information token pairs
- Shape and spacing: `--gsv-radius-card`, `--gsv-radius-control`, `--gsv-control-height`
- Layout: `--gsv-content-max`

## Typography

- One clear page title per route.
- Section eyebrows are short uppercase labels.
- Section headings should be readable without dominating the page.
- Supporting text should explain action and scope, not implementation history.
- Avoid oversized single-number cards and low-contrast explanatory blocks.

## Buttons and Actions

- Use one obvious primary action per major section where practical.
- Status labels must not look like buttons.
- Destructive actions must remain visually distinct.
- Icon-only controls need accessible names.
- Mobile controls must remain touch-friendly.

## Cards and Sections

- Use cards for meaningful groups, not every sentence.
- Prefer compact metric grids for numerical scans.
- Prefer list rows for attention items and recent activity.
- Use disclosure panels for secondary detail.
- Avoid equal emphasis across daily work, admin, QA, and historical context.

## Status Language

Statuses must be understandable without relying on color alone:

- Draft
- Planning
- Confirmed
- Active
- Completed
- Cancelled
- Training Event
- Paid
- Partially Paid
- Unpaid
- Complimentary
- Outstanding
- Blocked
- Needs Attention

## Responsive Standard

- Desktop may use wider grids and tables.
- Tablet should wrap without clipping currency or headings.
- Mobile should prioritize Overview, Guests, Tickets, Check-In, and More.
- Bottom navigation must not cover primary content.
- Document-level horizontal overflow is a release blocker.
