/**
 * Evaluate access based on policy, identity and purpose.
 * @param {object} policy - AccessPolicy shape
 * @param {object} identity - { orgId: string, roles: string[] }
 * @param {string} purpose - The purpose of the access request
 * @returns {{ allow: boolean, reason: string }}
 */
export function evaluateAccess(policy, identity, purpose) {
  // Rule 1: pii must be false
  if (policy.pii !== false) {
    return { allow: false, reason: 'pii must be false' }
  }

  // Rule 2: purpose must be in allowedPurposes
  if (!policy.allowedPurposes.includes(purpose)) {
    return { allow: false, reason: `purpose '${purpose}' not allowed` }
  }

  // Rule 3: identity.roles must intersect with allowedRoles
  const rolesSet = new Set(policy.allowedRoles)
  const hasRole = identity.roles.some((r) => rolesSet.has(r))
  if (!hasRole) {
    return { allow: false, reason: 'no matching role' }
  }

  return { allow: true, reason: 'access granted' }
}
