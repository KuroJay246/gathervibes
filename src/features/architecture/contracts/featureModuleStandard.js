export const FEATURE_MODULE_DIRECTORIES = [
  'components',
  'hooks',
  'services',
  'validators',
  'readModels',
  'contracts',
  'tests',
]

export const FEATURE_MODULE_RESPONSIBILITIES = {
  page: 'Route composition, URL state, and feature orchestration.',
  components: 'Rendering, accessibility, and local interaction only.',
  hooks: 'Subscriptions, lifecycle, and reusable UI orchestration.',
  services: 'Persistence, transactions, batches, and external calls.',
  validators: 'Input normalization, schema checks, limits, and safe defaults.',
  readModels: 'Side-effect-free conversion from domain records to view-ready data.',
  contracts: 'Shared constants, statuses, field sets, and cross-layer invariants.',
  tests: 'Current, historical, malformed, and boundary behavior coverage.',
}

export const READ_MODEL_REQUIREMENTS = [
  'side-effect-free',
  'current-record-compatible',
  'historical-record-compatible',
  'safe-defaults',
  'malformed-input-tolerant',
  'independently-tested',
]
