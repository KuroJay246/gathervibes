from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'output' / 'web-production-completion'
OUT = EVIDENCE / 'reports' / 'GSV_CROSS_LEARNING_MODERNIZATION_AND_EVIDENCE_REPORT.pdf'
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodySmall', parent=styles['BodyText'], fontSize=8.8, leading=12, spaceAfter=5, textColor=colors.HexColor('#33262D')))
styles.add(ParagraphStyle(name='Section2', parent=styles['Heading2'], fontSize=15, leading=18, spaceBefore=9, spaceAfter=6, textColor=colors.HexColor('#7B3545')))
styles.add(ParagraphStyle(name='Caption2', parent=styles['BodyText'], fontSize=7.8, leading=10, alignment=1, textColor=colors.HexColor('#6B564C')))
def p(text, style='BodySmall'): return Paragraph(text, styles[style])
def img(name, width=3.1*inch):
    path = EVIDENCE / name
    if not path.exists(): return p(f'Missing evidence: {name}')
    value = Image(str(path)); value._restrictSize(width, 4.2*inch); return value
def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Helvetica', 7.5); canvas.setFillColor(colors.HexColor('#8B7770'))
    canvas.drawString(.65*inch, .42*inch, 'Gather & Savor Event Hub | Cross-learning modernization | 2026-09-25')
    canvas.drawRightString(7.85*inch, .42*inch, f'Page {doc.page}'); canvas.restoreState()

story = [Spacer(1, .6*inch), p('Gather & Savor Event Hub', 'Title'), p('Cross-Learning Modernization and Evidence Report', 'Title'), p('Event-first implementation informed by mature Couple Book patterns and Learning Web Design principles. Couple Book was read-only reference material.', 'BodySmall'), Spacer(1, .2*inch)]
decision = Table([[p('<b>IMPLEMENTATION STATUS</b><br/><font color="#7B3545" size="13">ENGINEERING CHANGES IMPLEMENTED - FINAL VALIDATION PENDING</font>')]], colWidths=[6.9*inch])
decision.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF4E2')),('BOX',(0,0),(-1,-1),.8,colors.HexColor('#D7B26B')),('LEFTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
story += [decision, PageBreak()]

sections = [
('1. Executive summary', 'Event Hub already had the stronger event-first operational model: Working Event, multi-role access, assignments, scanner restrictions, check-in, System QA, and production security. The implementation borrows only mature Couple Book patterns: centralized route metadata, explicit workflow lifecycle contracts, stale-request versioning, and resource cleanup. It does not copy Couple Book branding, relationship terminology, routes, or data semantics.'),
('2. Current baseline', 'Starting commit was d0a07c6703d47729c20d54c39e0a882004c96938 on main, equal to origin/main, with only the user-provided untracked AGENTS.md present. No Couple Book source, JadenCreates source, Firebase production settings, CPB data, or QR semantics were changed.'),
('3. Patterns already strong', 'Protected AppShell, Working Event context, role-aware navigation, mobile tabs plus More drawer, safe-area handling, focus trapping, default-deny authorization, event-scoped Rules, read models for Dashboard/Registrations/Imports/Operations/Check-In, audit logging, System QA, and guarded check-in were retained.'),
('4. Patterns strengthened', 'A single route/feature manifest now records 18 active routes with event requirement, mobile availability, read model, mutation service, privilege status, realtime requirement, QA coverage, and production status. AppShell derives page title/help context from that manifest. CSV exports now revoke temporary object URLs after download.'),
('5. New shared contracts', 'The workflow lifecycle module defines explicit import, check-in, and provider states. The request-version helper supplies a small deterministic mechanism for rejecting late stale responses. Tests cover manifest coverage, lifecycle membership/snapshots, and stale request rejection.'),
('6. Read models and writes', 'Existing feature read models remain the source of business interpretation. Existing service boundaries remain in place. The report records selective revision protection as the next step for high-conflict organizer records rather than adding revisions indiscriminately. Destructive imports, financial corrections, staff privilege changes, provider sends, webhooks, and expensive cross-event reports still require explicit mediation review.'),
('7. UX and Learning Web Design application', 'The implementation preserves the established Event Hub identity while improving semantic metadata, explicit state vocabulary, accessible navigation, responsive shell behavior, reduced-motion support already present in the stylesheet, and resource cleanup. No broad visual redesign was performed.'),
('8. Validation', 'Targeted tests passed, lint passed, and the production build passed after the implementation. The complete test suite, Rules emulator suite, Android regression, responsive evidence, and final concurrency/load measurements remain required before calling the campaign fully complete.'),
('9. Evidence and release boundaries', 'Existing evidence remains in output/web-production-completion. New matrices and the final implementation report are in owner-closeout. No Hosting, Rules, indexes, App Check enforcement, billing, provider, or production data mutation was performed.'),
('10. Event Hub priorities', 'Finish direct-write coverage, wire lifecycle contracts into real complex controllers, add selective revisions and conflict UI, add stale response protection to search/lookup/report flows, run emulator-backed rules tests, execute CODEX_DEMO large-data and concurrent check-in tests, capture web/mobile runtime screenshots, and complete final PDF/Git closeout.'),
('11. Final judgment', 'The strongest Couple Book lessons are now represented in Event Hub without changing its product identity. The implementation is not a final release pass yet because final validation and evidence remain pending. CPB received zero synthetic writes; Couple Book remained read-only; JadenCreates remained untouched.'),
]
for title, body in sections: story += [p(title, 'Section2'), p(body)]
story += [PageBreak(), p('Current runtime evidence', 'Section2')]
visual_rows = [[img('after/local-dashboard-desktop.png'), p('<b>Dashboard</b><br/>Existing authenticated synthetic evidence with Working Event context.', 'Caption2')], [img('after/local-checkin-tablet.png'), p('<b>Tablet Check-In</b><br/>Existing responsive operational evidence.', 'Caption2')], [img('after/local-qa-mobile.png'), p('<b>Mobile System QA</b><br/>Existing mobile web evidence; not native Android proof.', 'Caption2')], [img('after/local-settings-desktop.png'), p('<b>Settings</b><br/>Existing authenticated synthetic settings evidence.', 'Caption2')]]
table = Table(visual_rows, colWidths=[3.3*inch, 3.4*inch]); table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#E3D2CA')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)])); story.append(table)
OUT.parent.mkdir(parents=True, exist_ok=True)
SimpleDocTemplate(str(OUT), pagesize=letter, rightMargin=.65*inch, leftMargin=.65*inch, topMargin=.65*inch, bottomMargin=.7*inch, title='GSV Cross-Learning Modernization and Evidence Report').build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
