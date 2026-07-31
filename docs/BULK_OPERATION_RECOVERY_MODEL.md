# Bulk Operation Recovery Model

This model applies to organizer-initiated import and bulk registration writes.

## Operation Manifest

Each bulk operation builds a small manifest before writing:

- operation type;
- selected event ID;
- initiating user identifier;
- stable operation ID;
- record IDs only;
- total record count;
- chunk size;
- chunk count;
- creation time;
- validation result;
- current status.

The manifest does not store private guest details. It is returned to the UI as part of the operation result and is also referenced in audit-log details.

## Chunking

Imports continue to use 50-row chunks because each registration create is paired with an audit-log create. Registration bulk deletion, payment status updates, and finance updates use smaller chunks to keep write batches narrow and recoverable.

If a chunk succeeds, its record IDs are recorded in `completedChunks`. If a later chunk fails, the service returns a partial result with completed, failed, and unattempted record IDs.

## Idempotency

Audit-log IDs for bulk operations are deterministic:

`operationId + chunkIndex + targetId -> stable audit-log ID`

This lets the same operation identify already completed records and prevents retry guidance from rewriting completed rows.

Import retry callers can pass `completedRecordIds` to resume with only remaining rows. The retry cannot switch to another event because each row is checked against the selected event before commit.

## Organizer Messaging

Partial completion uses precise wording, for example:

`35 of 50 records were updated. 15 remain unchanged.`

The UI avoids claiming complete success when a later chunk failed.

## No New Collection

This release does not add a durable operation-tracking collection. The selected audit findings can be corrected with deterministic client manifests, deterministic audit IDs, paired Firestore batches, and retryable row lists. A future durable queue can be added if the product needs recovery across browser closure or multi-user operation handoff.
