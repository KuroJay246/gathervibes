export function createRequestVersion() {
  let version = 0
  return Object.freeze({
    next() { version += 1; return version },
    current() { return version },
    isCurrent(candidate) { return candidate === version },
  })
}
