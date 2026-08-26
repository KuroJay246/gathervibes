from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'output' / 'web-production-completion'
OUT = EVIDENCE / 'reports' / 'GSV_Final_Production_Closeout_and_Owner_Acceptance_Report.pdf'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Cover', parent=styles['Title'], fontSize=23, leading=28, alignment=TA_CENTER, textColor=colors.HexColor('#2B1723'), spaceAfter=16))
styles.add(ParagraphStyle(name='Section', parent=styles['Heading2'], fontSize=15, leading=19, textColor=colors.HexColor('#7B3545'), spaceBefore=11, spaceAfter=7))
styles.add(ParagraphStyle(name='Body2', parent=styles['BodyText'], fontSize=9.5, leading=14, textColor=colors.HexColor('#33262D'), spaceAfter=6))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontSize=8, leading=11, textColor=colors.HexColor('#4A3B36')))
styles.add(ParagraphStyle(name='Caption', parent=styles['BodyText'], fontSize=8, leading=10, alignment=TA_CENTER, textColor=colors.HexColor('#6B564C')))

def para(text, style='Body2'):
    return Paragraph(text, styles[style])

def image(name, width):
    path = EVIDENCE / name
    if not path.exists():
        return para(f'Missing evidence: {name}', 'Small')
    value = Image(str(path))
    value._restrictSize(width, 5.1 * inch)
    return value

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(colors.HexColor('#8B7770'))
    canvas.drawString(0.65 * inch, 0.42 * inch, 'Gather & Savor Event Hub | Production evidence | 2026-08-26')
    canvas.drawRightString(7.85 * inch, 0.42 * inch, f'Page {doc.page}')
    canvas.restoreState()

story = [Spacer(1, 0.55 * inch), para('Gather & Savor Event Hub', 'Cover'), para('Web Production Security, Reliability, and Visual Evidence Report', 'Cover'), para('Production target: gathervibeshub.web.app<br/>Firebase project: gathervibeshub<br/>Assessment date: 2026-08-26', 'Body2'), Spacer(1, 0.2 * inch)]
decision = Table([[para('<b>RELEASE DECISION</b><br/><font color="#7B3545" size="14">PASS WITH EXTERNAL OWNER ACTIONS REQUIRED</font>')]], colWidths=[6.9 * inch])
decision.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF4E2')), ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#D7B26B')), ('LEFTPADDING', (0, 0), (-1, -1), 14), ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 12)]))
story += [decision, Spacer(1, 0.2 * inch), para('The scoped web engineering work is implemented, tested, visually evidenced, and deployed to Firebase Hosting. Full release completion remains dependent on controls and acceptance steps requiring owner access to Firebase, Google Cloud, provider consoles, production accounts, physical devices, or billing configuration.'), PageBreak()]

story += [para('Executive Summary', 'Section'), para('This pass hardened the deployed web surface, added optional Firebase App Check initialization without embedding secrets, preserved the default-deny Firestore model, and verified the resulting Hosting response. The application was exercised locally with synthetic emulator data across desktop, tablet, and mobile layouts. The dedicated Android staff package was preserved and visually checked after a clean app-data reset.')]
rows = [[para('<b>Implemented and verified</b>', 'Small'), para('<b>Implemented but owner-configured</b>', 'Small'), para('<b>Not verified here</b>', 'Small')], [para('Rules-backed identity and event scoping; append-only audit; ticket/check-in controls; import preview and formula sanitization; CSP and response headers; automated QA; Hosting deployment.', 'Small'), para('Web App Check site key/enforcement; API-key referrer restrictions; Sentry DSN and alerting; provider OAuth/webhooks.', 'Small'), para('Authenticated Protected Owner acceptance; backups/restore; budgets/quotas; iOS signing/device; live provider receipts; mobile audit residual.', 'Small')]]
table = Table(rows, colWidths=[2.3 * inch] * 3)
table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2B1723')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E3D2CA')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
story += [table, para('Identity and scope', 'Section')]
for item in ['Firebase project: <b>gathervibeshub</b>; public Hosting target: <b>https://gathervibeshub.web.app</b>.', 'Deployment scope was Hosting only. No Firestore rules, indexes, functions, storage, or Auth configuration was changed by the deploy.', 'Authenticated UI evidence uses synthetic emulator data. The production login image is public unauthenticated evidence; no authenticated production owner session was available.']:
    story.append(para('• ' + item))

story += [para('Security and reliability controls', 'Section')]
for item in ['Firestore rules remain default deny and enforce Protected Owner, approved organizer, staff assignment, assigned-event access, cross-event boundaries, append-only audits, ticket identity, and check-in constraints.', 'The deployed CSP uses explicit script, connect, frame, image, worker, and media allowlists for the Firebase client, Google/reCAPTCHA, and optional Sentry ingestion. Before/after header captures are stored with this report.', 'App Check initialization is implemented behind VITE_FIREBASE_APP_CHECK_SITE_KEY. The deployed build did not contain a production site key, so enforcement is not claimed.', 'Client-side Firebase configuration contains public client identifiers only. API-key restriction and provider secret configuration require Google Cloud/Firebase owner verification.', 'Monitoring, backup/restore, billing alerts, and quota controls were not inferable from source or Hosting headers and remain owner actions.']:
    story.append(para('• ' + item))

story += [para('Validation and deployment', 'Section')]
for item in ['npm run lint: passed.', 'npm test: 576 passed, 0 failed, 74 skipped.', 'Emulator rules checks: 56/56 passed; browser smoke: 1/1 passed.', 'npm audit --omit=dev: 0 vulnerabilities.', 'Mozilla HTTP Observatory after deployment: A+ / 115, 10 passed, 0 failed, HTTP 200.', 'Production response: HTTP 200 with HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy, strict referrer policy, and the deployed CSP.', 'The production bundle completed; a later Windows libuv shutdown assertion occurred after output generation and did not prevent Hosting deployment.']:
    story.append(para('• ' + item))

story += [para('Visual evidence', 'Section'), para('<b>Production public surface</b>')]
visuals = [[image('after/production-login-desktop.png', 3.15 * inch), para('<b>Production login</b><br/>Public production page after Hosting deployment. No authenticated production claim.', 'Caption')], [image('after/local-dashboard-desktop.png', 3.15 * inch), para('<b>Desktop authenticated dashboard</b><br/>Synthetic emulator fixture with selected Working Event and derived operational state.', 'Caption')], [image('after/local-settings-desktop.png', 3.15 * inch), para('<b>Desktop settings and access</b><br/>Synthetic fixture showing account/access and owner-boundary presentation.', 'Caption')]]
visual_table = Table(visuals, colWidths=[3.25 * inch, 3.45 * inch])
visual_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#E3D2CA')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
story += [visual_table, PageBreak(), para('Responsive and Android evidence', 'Section')]
responsive = [[image('after/local-checkin-tablet.png', 2.55 * inch), para('<b>Tablet check-in</b><br/>Synthetic fixture showing event-day check-in, QR/manual lookup, readiness counts, and bottom navigation.', 'Caption')], [image('after/local-qa-mobile.png', 2.0 * inch), para('<b>Mobile System QA</b><br/>Synthetic fixture showing compact navigation, status checks, event scope, and safe QA guidance.', 'Caption')], [image('owner-closeout/android-e2e-pass.png', 2.35 * inch), para('<b>Android regression result</b><br/>The existing installed gsv_api36_staff package passed all 11 guarded flows. This final sign-out capture is retained as run evidence, not as authenticated-screen proof; a source-only stale-error fix awaits the next approved native build.', 'Caption')]]
responsive_table = Table(responsive, colWidths=[3.0 * inch, 3.7 * inch])
responsive_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#E3D2CA')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
story += [responsive_table, para('External owner actions required for full release', 'Section')]
for item in ['Register the production web App Check site key and enforce App Check after confirming approved origins.', 'Sign in as the Protected Owner on the live site and execute owner, organizer, staff assignment, cross-event denial, audit, ticket, check-in, and import acceptance using approved production test records.', 'Register provider OAuth callbacks, secrets, scopes, and webhooks; capture an authenticated receipt for each live provider.', 'Configure monitoring, billing budgets, quotas, abuse monitoring, scheduled backups, retention, and a documented restore rehearsal.', 'Complete iOS physical-device/signing acceptance and resolve or explicitly accept the existing mobile dependency-audit residual.']:
    story.append(para('• ' + item))
story += [para('Artifacts', 'Section'), para('The complete package is in output/web-production-completion/: the readiness ledger, before/after security header captures, browser screenshots, Android regression evidence, and the earlier security report. The owner-closeout folder contains live owner screenshots, the Firebase Console MFA blocker, and mobile audit JSON.')]
story += [PageBreak(), para('Owner acceptance and configuration boundaries', 'Section'), para('The existing Chrome owner session successfully loaded the live app as the Protected Owner. The immutable UID-backed owner boundary was visible, CODEX_DEMO was selected, Staff & Assignments and Integrations loaded, and the read-only System QA run reported 84 of 84 checks without a blocking failure. No production write, provider send, or destructive action was submitted.')]
owner_visual = Table([[image('owner-closeout/production-owner-settings.png', 3.75 * inch), para('<b>Live Protected Owner settings</b><br/>Authenticated production evidence. Owner email and role are visible as application status; no password or token is shown.', 'Caption')]], colWidths=[4.0 * inch, 2.7 * inch])
owner_visual.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#E3D2CA')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
story += [owner_visual, para('Configuration results', 'Section')]
for item in ['App Check: web reCAPTCHA v3 code path is deployed, but the public site key is absent from the build and Console enforcement is not active. Native Android App Check is not configured in the Expo package.', 'API keys: Google Cloud inspection found empty application restrictions on the Firebase Browser and Android auto-created keys. No rotation was performed. Owner must add approved web referrers and Android package/signing restrictions, keep API targets minimal, and validate Auth/Firestore.', 'Providers: live Settings truthfully reports Forms packaged but not deployed, Sheets manual CSV/Excel, Gmail disconnected, Outlook authorization required, and Message Builder copy-only.', 'Monitoring, billing, backups, restore rehearsal, rollback console state, and provider receipts remain unverified. Firebase Console access is currently blocked by mandatory MFA; the blocker capture is owner-closeout/firebase-console-mfa-blocker.png.', 'Mobile audit: 15 moderate findings, 0 high, 0 critical. Findings are in Expo/xcode/uuid dependency chains; classify against the shipped artifact before release. iOS configuration is prepared, but physical signing/device acceptance is pending.', 'Android regression: 11/11 guarded flows passed on the existing installed package. A stale post-sign-out error banner was source-fixed in AuthProvider; the installed APK was intentionally not rebuilt, so updated visual confirmation remains pending.']:
    story.append(para('• ' + item))

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUT), pagesize=letter, rightMargin=0.65 * inch, leftMargin=0.65 * inch, topMargin=0.65 * inch, bottomMargin=0.65 * inch, title='GSV Web Production Security, Reliability, and Visual Evidence Report')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
