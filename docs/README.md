# Gathetr Technical Documentation

This documentation system is for the Gather & Savor Event Hub codebase at `C:\Users\Jaylan\Documents\gathetr`.

Open first:

1. `docs/manual/00-cover-and-document-control.md`
2. `docs/manual/01-quick-start-and-emergency-reference.md`
3. `docs/manual/14-troubleshooting-and-repairs.md`

The editable Markdown source files are authoritative. The PDF in `docs/generated/` is a generated snapshot for reading and sharing.

## Organization

- `docs/manual/`: owner/developer service manual volumes.
- `docs/runbooks/`: symptom-based repair procedures.
- `docs/data-dictionary/`: Firestore collection and field reference.
- `docs/permissions/`: role and rule matrices.
- `docs/decisions/`: architecture decision records.
- `docs/problem-register/`: known problems, root causes, and repair status.
- `docs/templates/`: future change, repair, release, and incident templates.
- `docs/diagrams/`: Mermaid diagram source.
- `docs/generated/`: generated PDF and combined manual snapshot. Do not edit generated files by hand.

## Regenerate

Run:

```powershell
npm run docs:generate
npm run docs:validate
```

## Update Rule

After meaningful development work, report:

- Documentation reviewed: YES/NO
- Documentation changed: YES/NO
- Documentation files changed
- Reason no documentation update was required
