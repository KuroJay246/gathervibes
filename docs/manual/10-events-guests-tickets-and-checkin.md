# Events, Guests, Tickets, and Check-In

## Event Management

Events are managed by `EventsPage` and `eventService`. The Working Event context determines which event-scoped pages load data.

## Guest Registrations

Registrations include guest identity, persons attending, payment state, ticket status, historical attendance evidence, and scanner-confirmed check-in fields. Registration mutations must stay atomic with audit evidence.

## Tickets and QR

QR payload is exactly:

```text
GSV:TICKET:{ticketCode}
```

Do not put private guest data into QR payloads.

## Check-In Flow

```mermaid
flowchart TD
  Ticket[Ticket code] --> Payload["GSV:TICKET:{ticketCode}"]
  Payload --> QR[QRCode rendering]
  QR --> Scanner[Camera or manual scanner panel]
  Scanner --> Parse[qrTicketUtils parses safe ticket code]
  Parse --> Lookup[Lookup registration in selected/assigned event]
  Lookup --> Confirm[Operator explicitly checks in]
  Confirm --> Firestore[Minimal checkedIn fields + audit log]
  Firestore --> Feedback[Success, duplicate, or permission feedback]
```
