# Final Post-Refinement Risk Register - 2026-08

## Summary

No P0 or P1 release blockers were found. The product is stable enough for continued real use and scoped feature development. Remaining items are targeted manual acceptance limitations and maintainability cleanup.

| Priority | Count |
| --- | ---: |
| P0 Critical | 0 |
| P1 High | 0 |
| P2 Medium | 3 |
| P3 Low | 6 |

## P2 Findings

| Finding | Type | Status | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| Authenticated production-browser visual/console acceptance is not fully automated in this environment. | Manual acceptance limitation | Not a product defect. | Automation limitation noted in brief; local/E2E validation passed. | Run a human Chrome pass before stakeholder demo or production claims. |
| React Doctor flags AuthProvider state/loading patterns. | Technical debt | Advisory. | `npm run doctor:json`: 0 errors, 176 warnings. | Refactor auth state transitions in a stabilization pass, not inside audit. |
| Large route components increase change risk. | Technical debt | Advisory. | React Doctor large-component warnings; source inspection. | Split high-change pages after next feature boundary is clear. |

## P3 Findings

| Finding | Type | Status | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| Java runtime will need upgrade before future Firebase CLI versions. | Tooling maintenance | Backlog. | Firebase emulator warning during E2E. | Move to Java 21 before firebase-tools 15 adoption. |
| Dialog/focus advisories remain in complex modals. | Accessibility debt | Backlog. | React Doctor warnings. | Fix by component cluster. |
| Some historical compatibility and phase-era docs remain in repository. | Repository hygiene | Backlog. | Docs inventory and static inspection. | Archive or summarize after release branch work is complete. |
| Some unused exports/dead-code candidates remain. | Maintainability | Backlog. | React Doctor warnings. | Remove only with targeted import graph verification. |
| True 200% zoom is not proven by current automation. | Manual acceptance limitation | Backlog. | Automated accessibility passes but exact zoom requires browser. | Manual acceptance before major demo. |
| Durable recovery after browser closure during partial bulk flows is not guaranteed as a current requirement. | Future enhancement | Deferred. | Import retry remaining and bulk payment recovery are covered in-session. | Consider durable recovery if organizers run large production imports often. |

## Historical Issues

| Historical Issue | Current Classification |
| --- | --- |
| CPB special protection model | Resolved/superseded. CPB is a normal completed real event. |
| Payment Reconciliation hardcoded to CPB | Resolved. It is scoped to selected Working Event. |
| Registration payments mixed with Operations | Resolved. Current UX and reports keep boundaries separate. |
| QR payload privacy concern | Resolved. Payload remains `GSV:TICKET:{ticketCode}`. |
| Access workflow activation risk | Still disabled by design. |
| Scanner permission expansion risk | Controlled. Scanner route and rules remain scoped. |
