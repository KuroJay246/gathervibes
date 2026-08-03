# Event-Day Run of Show Standard

## Purpose

Run of Show is the operational sequence for a selected Working Event. It is not a public schedule, guest portal, payment workflow, or scanner workflow.

## Standard Fields

- `date`, `startTime`, and optional `endTime` define operating order.
- `category` describes the type of event-day activity.
- `status` describes current progress: planned, confirmed, in progress, completed, delayed, or cancelled.
- `responsibleLabel`, `responsibleStaffUid`, `responsibleContactId`, and `responsibleOrganizationId` identify responsibility without granting access.
- `expectedArrivalTime`, `arrivalStatus`, and `arrivalNote` support supplier/staff arrival checks.
- `dependencyItemIds`, `linkedTaskId`, `linkedDocumentIds`, and `linkedResourceIds` connect related work without requiring linked records to change.

## Rules

- End time cannot be before start time.
- Overlapping timeline items are allowed because real events can run parallel activity.
- Delay state requires organizer review but does not modify related tasks or resources automatically.
- Deletes are audited; audit logs remain append-only.

## Deferred

- Drag-and-drop sequencing.
- Exportable run sheet.
- Real-time floor-manager mode.
- Supplier-facing portal.

