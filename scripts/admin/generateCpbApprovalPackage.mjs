/* global process, console */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const manifestPath = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest\\CPB_Proposal_Manifest_New_Private.json'
const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest_Approval'

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function stableStringify(value) {
  return JSON.stringify(stable(value), null, 2)
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')
}

function moneyFields(proposal) {
  return proposal.changedFields.filter((field) => ['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue'].includes(field))
}

function isReplacement(proposal, field) {
  const current = proposal.currentValues[field]
  return current !== null && current !== undefined && String(current) !== ''
}

function patternFor(proposal) {
  const fields = proposal.changedFields
  if (fields.includes('paymentStatus') && proposal.proposedValues.paymentStatus === 'door') return 'Door Paid'
  if (fields.includes('paymentStatus') && proposal.proposedValues.paymentStatus === 'door-list') return 'To Pay at Door'
  if (fields.includes('paymentStatus') && proposal.proposedValues.paymentStatus === 'complimentary') return 'Complimentary'
  if ((proposal.proposedValues.amountPaid || 0) > 0 && (proposal.proposedValues.balanceDue || 0) > 0) return 'Partial deposit'
  if (fields.includes('paymentStatus') && proposal.proposedValues.paymentStatus === 'paid') return proposal.proposedValues.priceTier ? `${proposal.proposedValues.priceTier} fully paid` : 'Fully paid'
  if (fields.length === 1 && fields[0] === 'paymentMethod') return 'Blank payment-method fill'
  if (fields.length === 1 && fields[0] === 'priceTier') return 'Blank price-tier fill'
  if (moneyFields(proposal).length > 0) return 'Financial correction'
  return 'Other supported field fill'
}

function highRiskReasons(proposal) {
  const reasons = []
  if (proposal.changedFields.some((field) => moneyFields(proposal).includes(field) && isReplacement(proposal, field))) reasons.push('nonblank monetary replacement')
  if (proposal.changedFields.includes('paymentStatus') && isReplacement(proposal, 'paymentStatus')) reasons.push('payment-status replacement')
  if (proposal.proposedValues.paymentStatus === 'door') reasons.push('Door Paid proposal')
  if (proposal.proposedValues.paymentStatus === 'door-list') reasons.push('To Pay at Door proposal')
  if ((proposal.proposedValues.amountPaid || 0) > 0 && (proposal.proposedValues.balanceDue || 0) > 0) reasons.push('partial-deposit record')
  if (proposal.proposedValues.paymentStatus === 'complimentary') reasons.push('complimentary record')
  if (proposal.changedFields.filter((field) => ['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue'].includes(field)).length >= 3) reasons.push('three or more money fields')
  if (proposal.warnings.length > 0) reasons.push('proposal warning')
  return reasons
}

function groupProposals(proposals) {
  const groups = new Map()
  proposals.forEach((proposal) => {
    const pattern = patternFor(proposal)
    const key = `${pattern}|${proposal.changedFields.join('|')}`
    if (!groups.has(key)) {
      groups.set(key, {
        groupId: `GROUP-${String(groups.size + 1).padStart(3, '0')}`,
        pattern,
        affectedFields: proposal.changedFields,
        proposalIds: [],
        proposalCount: 0,
        moneyEffect: { amountDue: 0, amountPaid: 0, balanceDue: 0 },
        replacements: 0,
        blankFills: 0,
        highRiskProposalIds: [],
        warnings: 0,
      })
    }
    const group = groups.get(key)
    group.proposalIds.push(proposal.proposalId)
    group.proposalCount += 1
    ;['amountDue', 'amountPaid', 'balanceDue'].forEach((field) => {
      if (proposal.changedFields.includes(field)) {
        group.moneyEffect[field] += Number(proposal.proposedValues[field] || 0) - Number(proposal.currentValues[field] || 0)
      }
    })
    proposal.changedFields.forEach((field) => {
      if (isReplacement(proposal, field)) group.replacements += 1
      else group.blankFills += 1
    })
    if (highRiskReasons(proposal).length) group.highRiskProposalIds.push(proposal.proposalId)
    group.warnings += proposal.warnings.length
  })
  return [...groups.values()]
}

async function main() {
  const manifestText = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestText)
  const manifestHash = manifest.manifestSha256
  if (!manifestHash) {
    throw new Error('Manifest is missing manifestSha256; approval package cannot be generated.')
  }
  const proposals = manifest.proposals || []
  const groups = groupProposals(proposals)
  const proposalRisk = proposals.map((proposal) => ({
    proposalId: proposal.proposalId,
    registrationIdMasked: proposal.registrationIdMasked,
    changedFields: proposal.changedFields,
    pattern: patternFor(proposal),
    highRiskReasons: highRiskReasons(proposal),
    warnings: proposal.warnings,
  }))
  const unresolvedDecisions = proposals.length
  const decisions = {
    manifestSha256: manifestHash,
    manifestPath,
    approvalState: 'unresolved',
    finalApprovalPhrase: `I APPROVE CPB MANIFEST ${manifestHash} FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY`,
    partialApprovalPhrase: `I PARTIALLY APPROVE CPB MANIFEST ${manifestHash} USING THE SAVED APPROVAL DECISIONS FOR PHASE 23G APPLY REHEARSAL AND PHASE 23H APPLY DESIGN ONLY`,
    rejectionPhrase: `I DO NOT APPROVE CPB MANIFEST ${manifestHash}`,
    decisions: Object.fromEntries(proposals.map((proposal) => [proposal.proposalId, {
      decision: 'unresolved',
      fieldDecisions: Object.fromEntries(proposal.changedFields.map((field) => [field, 'unresolved'])),
      highRiskReasons: highRiskReasons(proposal),
    }])),
    unresolvedDecisions,
    firestoreWritesPerformed: false,
    manifestMutated: false,
  }

  const fieldCounts = proposals.reduce((counts, proposal) => {
    proposal.changedFields.forEach((field) => { counts[field] = (counts[field] || 0) + 1 })
    return counts
  }, {})
  const summary = {
    manifestSha256: manifestHash,
    proposalCount: proposals.length,
    fieldChangeCount: proposals.reduce((sum, proposal) => sum + proposal.changedFields.length, 0),
    blankFillCount: proposalRisk.reduce((sum, item) => sum + proposals.find((proposal) => proposal.proposalId === item.proposalId).changedFields.filter((field) => !isReplacement(proposals.find((proposal) => proposal.proposalId === item.proposalId), field)).length, 0),
    existingValueReplacementCount: proposalRisk.reduce((sum, item) => sum + proposals.find((proposal) => proposal.proposalId === item.proposalId).changedFields.filter((field) => isReplacement(proposals.find((proposal) => proposal.proposalId === item.proposalId), field)).length, 0),
    moneyFieldCount: proposals.reduce((sum, proposal) => sum + moneyFields(proposal).length, 0),
    statusFieldCount: fieldCounts.paymentStatus || 0,
    priceTierCount: fieldCounts.priceTier || 0,
    paymentMethodCount: fieldCounts.paymentMethod || 0,
    doorPaidProposalCount: proposals.filter((proposal) => proposal.proposedValues.paymentStatus === 'door').length,
    toPayAtDoorProposalCount: proposals.filter((proposal) => proposal.proposedValues.paymentStatus === 'door-list').length,
    partialDepositCount: proposals.filter((proposal) => (proposal.proposedValues.amountPaid || 0) > 0 && (proposal.proposedValues.balanceDue || 0) > 0).length,
    complimentaryCount: proposals.filter((proposal) => proposal.proposedValues.paymentStatus === 'complimentary').length,
    unresolvedDecisions,
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Approval_Decisions.json'), stableStringify(decisions))
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Approval_Summary_Masked.csv'), toCsv(groups.map((group) => ({
    groupId: group.groupId,
    pattern: group.pattern,
    proposalCount: group.proposalCount,
    affectedFields: group.affectedFields.join('|'),
    blankFills: group.blankFills,
    replacements: group.replacements,
    highRiskCount: group.highRiskProposalIds.length,
    warnings: group.warnings,
  }))))
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Field_Counts.json'), stableStringify(fieldCounts))
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Money_Changes_Masked.csv'), toCsv(proposals.filter((proposal) => moneyFields(proposal).length).map((proposal) => ({
    proposalId: proposal.proposalId,
    registrationIdMasked: proposal.registrationIdMasked,
    moneyFields: moneyFields(proposal).join('|'),
    amountDueDelta: Number(proposal.proposedValues.amountDue || 0) - Number(proposal.currentValues.amountDue || 0),
    amountPaidDelta: Number(proposal.proposedValues.amountPaid || 0) - Number(proposal.currentValues.amountPaid || 0),
    balanceDueDelta: Number(proposal.proposedValues.balanceDue || 0) - Number(proposal.currentValues.balanceDue || 0),
  }))))
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Status_Changes_Masked.csv'), toCsv(proposals.filter((proposal) => proposal.changedFields.includes('paymentStatus')).map((proposal) => ({
    proposalId: proposal.proposalId,
    registrationIdMasked: proposal.registrationIdMasked,
    currentStatus: proposal.currentValues.paymentStatus,
    proposedStatus: proposal.proposedValues.paymentStatus,
    highRiskReasons: highRiskReasons(proposal).join('|'),
  }))))
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Door_Changes_Masked.csv'), toCsv(proposals.filter((proposal) => ['door', 'door-list'].includes(proposal.proposedValues.paymentStatus)).map((proposal) => ({
    proposalId: proposal.proposalId,
    registrationIdMasked: proposal.registrationIdMasked,
    proposedStatus: proposal.proposedValues.paymentStatus,
    amountPaid: proposal.proposedValues.amountPaid,
    balanceDue: proposal.proposedValues.balanceDue,
  }))))
  await writeFile(join(outputRoot, 'CPB_New_Manifest_Replacement_Warnings_Masked.csv'), toCsv(proposalRisk.filter((item) => item.highRiskReasons.length || item.warnings.length).map((item) => ({
    proposalId: item.proposalId,
    registrationIdMasked: item.registrationIdMasked,
    pattern: item.pattern,
    highRiskReasons: item.highRiskReasons.join('|'),
    warnings: item.warnings.join('|'),
  }))))

  console.log(JSON.stringify({ outputRoot, ...summary, groupCount: groups.length }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
