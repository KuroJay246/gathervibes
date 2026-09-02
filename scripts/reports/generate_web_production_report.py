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
    canvas.drawString(0.65 * inch, 0.42 * inch, 'Gather & Savor Event Hub | Production evidence | 2026-09-01')
    canvas.drawRightString(7.85 * inch, 0.42 * inch, f'Page {doc.page}')
    canvas.restoreState()

story = [Spacer(1, 0.55 * inch), para('Gather & Savor Event Hub', 'Cover'), para('Final Production Closeout and Owner Acceptance Report', 'Cover'), para('Production target: gathervibeshub.web.app<br/>Firebase project: gathervibeshub<br/>Assessment date: 2026-09-01', 'Body2'), Spacer(1, 0.2 * inch)]
decision = Table([[para('<b>RELEASE DECISION</b><br/><font color="#7B3545" size="14">PASS WITH EXTERNAL OWNER ACTIONS REQUIRED</font>')]], colWidths=[6.9 * inch])
decision.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF4E2')), ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#D7B26B')), ('LEFTPADDING', (0, 0), (-1, -1), 14), ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 12)]))
story += [decision, Spacer(1, 0.2 * inch), para('The scoped web and Android engineering work is implemented, tested, and visually evidenced. Hosting was deployed without weakening the live security headers, web App Check is registered with reCAPTCHA Enterprise and verified initialized in monitoring mode, Android App Check is source-configured and Console-registered in monitoring mode, and the current installed Android build passed the guarded regression suite. Full release completion still depends on the separately approved and owner-controlled controls listed in this report.'), PageBreak()]

story += [para('Executive Summary', 'Section'), para('This pass preserved the deployed web surface and its hardened CSP/security headers, restored Firebase Console access after owner MFA completion, registered Android App Check for `com.gathervibeshub.staff` with Play Integrity in monitoring mode, added native Android App Check initialization through React Native Firebase, and reran the guarded Android regression on the rebuilt installed APK. The application was exercised locally with synthetic emulator data across desktop, tablet, mobile web, and the dedicated Android staff AVD.')]
rows = [[para('<b>Implemented and verified</b>', 'Small'), para('<b>Implemented but owner-configured</b>', 'Small'), para('<b>Not verified here</b>', 'Small')], [para('Rules-backed identity and event scoping; append-only audit; ticket/check-in controls; import preview and formula sanitization; CSP and response headers; automated QA; Hosting deployment; web App Check registration and monitoring-mode initialization; Android App Check native wiring; rebuilt Android APK and guarded 11-flow regression.', 'Small'), para('App Check enforcement; API-key restrictions; Android debug-token registration; Sentry DSN and alerting; provider OAuth/webhooks; final Android signing identity.', 'Small'), para('Backups/restore rehearsal; budgets/quotas; live monitoring receipt; live provider receipts; iOS signing/device; final production-safe Android release signing.', 'Small')]]
table = Table(rows, colWidths=[2.3 * inch] * 3)
table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2B1723')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E3D2CA')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
story += [table, para('Identity and scope', 'Section')]
for item in ['Firebase project: <b>gathervibeshub</b>; public Hosting target: <b>https://gathervibeshub.web.app</b>.', 'Deployment scope was Hosting only. No Firestore rules, indexes, functions, storage, or Auth configuration was changed by the deploy.', 'Authenticated UI evidence includes a live owner session plus synthetic emulator data. No production write, provider send, or destructive production mutation was submitted.']:
    story.append(para('• ' + item))

story += [para('Security and reliability controls', 'Section')]
for item in ['Firestore rules remain default deny and enforce Protected Owner, approved organizer, staff assignment, assigned-event access, cross-event boundaries, append-only audits, ticket identity, and check-in constraints.', 'The deployed CSP uses explicit script, connect, frame, image, worker, and media allowlists for the Firebase client, Google/reCAPTCHA, the App Check exchange endpoint, and optional Sentry ingestion. Before/after header captures are stored with this report.', 'Web App Check is registered with reCAPTCHA Enterprise, the approved public site-key configuration is deployed, and authenticated production runtime reports initialized monitoring-mode App Check with no console warnings. Enforcement remains disabled pending separate approval.', 'Native Android App Check is initialized before Firebase Auth and Firestore, uses the debug provider for emulator/development, and uses Play Integrity for production builds. Firebase Console now shows the Android app registered for Play Integrity in monitoring mode.', 'Client-side Firebase configuration contains public client identifiers only. API-key restrictions, monitoring receipt, backup/restore, billing alerts, and quota controls still require Google Cloud/Firebase owner action or separate approval.']:
    story.append(para('• ' + item))

story += [para('Validation and deployment', 'Section')]
for item in ['npm run lint: passed.', 'npm test: 581 passed, 0 failed, 74 skipped.', 'Product QA passed, including 56/56 Firestore emulator rules checks and browser smoke 1/1.', 'Full browser E2E passed 10/10 under the Firebase emulators.', 'Android native validation passed: `expo-doctor`, `expo export --platform android`, `expo prebuild --platform android --clean`, `gradlew clean`, and `gradlew assembleDebug`.', 'Dedicated Android AVD regression passed 11/11 after installing the fresh rebuilt APK, including explicit stale `Sign-in failed.` absence after sign-out.', 'Mozilla HTTP Observatory after final deployment: A+ / 115, 10 passed, 0 failed, HTTP 200.', 'Production response: HTTP 200 with HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy, strict referrer policy, and the deployed CSP.']:
    story.append(para('• ' + item))

story += [para('Visual evidence', 'Section'), para('<b>Production public surface</b>')]
visuals = [[image('after/production-login-desktop.png', 3.15 * inch), para('<b>Production login</b><br/>Public production page after Hosting deployment. No authenticated production claim.', 'Caption')], [image('after/local-dashboard-desktop.png', 3.15 * inch), para('<b>Desktop authenticated dashboard</b><br/>Synthetic emulator fixture with selected Working Event and derived operational state.', 'Caption')], [image('after/local-settings-desktop.png', 3.15 * inch), para('<b>Desktop settings and access</b><br/>Synthetic fixture showing account/access and owner-boundary presentation.', 'Caption')]]
visual_table = Table(visuals, colWidths=[3.25 * inch, 3.45 * inch])
visual_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#E3D2CA')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
story += [visual_table, PageBreak(), para('Responsive and Android evidence', 'Section')]
responsive = [[image('after/local-checkin-tablet.png', 2.55 * inch), para('<b>Tablet check-in</b><br/>Synthetic fixture showing event-day check-in, QR/manual lookup, readiness counts, and bottom navigation.', 'Caption')], [image('after/local-qa-mobile.png', 2.0 * inch), para('<b>Mobile System QA</b><br/>Synthetic fixture showing compact navigation, status checks, event scope, and safe QA guidance.', 'Caption')], [image('owner-closeout/android-e2e-pass.png', 2.35 * inch), para('<b>Android regression result</b><br/>Fresh rebuilt and reinstalled staff APK evidence: guarded emulator regression passed 11/11, including valid check-in, duplicate rejection, invalid-code handling, camera denial, offline block, and explicit stale Sign-in failed absence after sign-out. The image is redacted and contains no credentials or ticket code.', 'Caption')]]
responsive_table = Table(responsive, colWidths=[3.0 * inch, 3.7 * inch])
responsive_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#E3D2CA')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
story += [responsive_table, para('External owner actions required for full release', 'Section')]
for item in ['Approve and apply the separately reviewed browser and Android API-key restrictions, then verify Auth/Firestore from real clients.', 'Review web and Android App Check metrics in monitoring mode, then request separate approval before any App Check enforcement.', 'Replace the current debug-keystore-backed local Android release signing with an owner-controlled release or Play signing identity before treating Android restrictions or Play Integrity as final production release state.', 'Register provider OAuth callbacks, secrets, scopes, and webhooks; capture an authenticated receipt for each live provider.', 'Configure monitoring, billing budgets, quotas, abuse monitoring, scheduled backups, retention, and a documented restore rehearsal.', 'Complete iOS physical-device/signing acceptance and resolve or explicitly accept the mobile dependency-audit residual documented in owner-closeout/mobile-audit-release-classification.md.']:
    story.append(para('• ' + item))
story += [para('Artifacts', 'Section'), para('The complete package is in output/web-production-completion/: the readiness ledger, before/after security header captures, browser screenshots, Android regression evidence, and the earlier security report. The owner-closeout folder contains live owner screenshots, the Firebase Console MFA blocker, and mobile audit JSON.')]
story += [PageBreak(), para('Owner acceptance and configuration boundaries', 'Section'), para('The existing Chrome owner session successfully loaded the live app as the Protected Owner. The immutable UID-backed owner boundary was visible, CODEX_DEMO was selected, Staff & Assignments and Integrations loaded, and the read-only System QA run reported 84 of 84 checks without a blocking failure. No production write, provider send, or destructive action was submitted.')]
owner_visual = Table([[image('owner-closeout/production-owner-settings.png', 3.75 * inch), para('<b>Live Protected Owner settings</b><br/>Authenticated production evidence. Owner email and role are visible as application status; no password or token is shown.', 'Caption')]], colWidths=[4.0 * inch, 2.7 * inch])
owner_visual.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.35, colors.HexColor('#E3D2CA')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
story += [owner_visual, para('Configuration results', 'Section')]
for item in ['App Check: the web app is registered with reCAPTCHA Enterprise, the approved public site-key configuration is deployed, and authenticated production initialization is verified in monitoring mode. Enforcement remains disabled. Native Android App Check is configured in the Expo package and the Android Firebase app is registered for Play Integrity in monitoring mode.', 'API keys: Google Cloud inspection found empty application restrictions on the Firebase Browser and Android auto-created keys. No rotation was performed. Owner must add approved web referrers and Android package/signing restrictions, keep API targets minimal, and validate Auth/Firestore.', 'Android signing: the current local `release` build type still uses the debug keystore, so the active SHA-1/SHA-256 are debug-certificate values and not final production release signing.', 'Providers: live Settings truthfully reports Forms packaged but not deployed, Sheets manual CSV/Excel, Gmail disconnected, Outlook authorization required, and Message Builder copy-only.', 'Monitoring receipt, billing, backups, restore rehearsal, and provider receipts remain unverified. Firebase Console access is restored, but those controls were not configured or approved in this pass.', 'Mobile audit: 15 moderate findings, 0 high, 0 critical. Classification is recorded in owner-closeout/mobile-audit-release-classification.md; no runtime release blocker was observed in the tested paths, with upstream fixes still required.', 'Android regression: the freshly rebuilt debug APK was installed on the dedicated emulator, the guarded regression passed 11/11, and the explicit stale post-sign-out error assertion passed.']:
    story.append(para('• ' + item))

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUT), pagesize=letter, rightMargin=0.65 * inch, leftMargin=0.65 * inch, topMargin=0.65 * inch, bottomMargin=0.65 * inch, title='GSV Web Production Security, Reliability, and Visual Evidence Report')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
