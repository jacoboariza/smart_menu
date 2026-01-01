# Security Policy

This document outlines the security policies and practices for the Smart Menu Semantic platform, aligned with **ISO 27001** information security management standards.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Email**: Send details to the project maintainers (see repository contacts)
2. **GitHub Security Advisories**: Use the "Security" tab to report privately
3. **Do NOT** create public issues for security vulnerabilities

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Initial acknowledgment | 48 hours |
| Initial assessment | 5 business days |
| Resolution target | 30 days (critical), 90 days (other) |

## Security Controls (ISO 27001 Aligned)

### A.9 - Access Control

- **API Authentication**: All API endpoints require `X-API-Key` header with constant-time comparison
- **Role-Based Access Control (RBAC)**: Comprehensive role/permission system via `X-Roles` header
  - Predefined roles: `admin`, `data_steward`, `data_consumer`, `data_producer`, `auditor`, `viewer`
  - Fine-grained permissions mapped to roles
- **Organization Isolation**: `X-Org-Id` header for multi-tenant separation
- **Session Management**: Secure session handling with configurable timeouts
  - Session timeout (default: 30 minutes)
  - Absolute timeout (default: 8 hours)
  - Maximum concurrent sessions per user
  - Optional IP binding for session hijacking prevention
- **Data Classification Access**: Role-based access to data classifications (public, internal, confidential, restricted)

### A.10 - Cryptography

- **Transport Security**: HTTPS enforced in production via HSTS
- **API Keys**: Generated with cryptographic entropy (min 32 characters)
- **Secure Hashing**: SHA-256/SHA-512 for data integrity
- **Constant-Time Comparison**: Prevents timing attacks on authentication
- **AES-GCM Encryption**: Available for sensitive data at rest
- **PBKDF2 Key Derivation**: For password-based encryption
- **Secure Random Generation**: Crypto API for tokens and UUIDs
- **No Plaintext Storage**: Sensitive data not stored in client-side storage

### A.12 - Operations Security

- **Input Validation**: All inputs validated with Zod schemas + dangerous pattern detection
- **Error Handling**: Generic error messages to prevent information leakage
- **Comprehensive Audit Logging**: 
  - Authentication events (login success/failure)
  - Access control decisions
  - Data operations (CRUD)
  - Security events (rate limits, suspicious activity)
  - System events
- **Rate Limiting**: Configurable per-IP rate limiting (default: 100 req/min)
- **Malware Protection**: Detection of SQL injection, XSS, path traversal, command injection

### A.13 - Communications Security

- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **CORS**: Restricted to necessary origins for API endpoints
- **No Sensitive Data in URLs**: Query parameters sanitized
- **Cache Control**: No-store, no-cache for sensitive responses

### A.14 - System Acquisition, Development and Maintenance

- **Input Sanitization**: HTML escaping, null byte removal, length truncation
- **Dangerous Pattern Detection**: SQL injection, XSS, path traversal, command injection
- **Dependency Management**: Regular `npm audit` checks recommended
- **Code Review**: All changes should be reviewed before merge
- **Testing**: Security-relevant code covered by automated tests (`server/tests/security.test.js`)

## Security Headers

The following security headers are configured:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Content-Security-Policy` | Configured | Prevent XSS/injection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | Configured | Disable unused features |

## Environment Variables

Required security-related environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | API authentication key | Yes |
| `INGEST_API_KEY` | Alternative key name | Yes (or API_KEY) |

### Best Practices for Secrets

1. Never commit secrets to version control
2. Use environment variables or secret managers
3. Rotate keys periodically
4. Use different keys per environment

## Data Protection

### Data Classification

| Type | Classification | Handling |
|------|----------------|----------|
| Menu data | Public | Standard controls |
| Occupancy signals | Internal | Aggregation required |
| API keys | Confidential | Never log or expose |
| Audit logs | Internal | Retention policy applies |

### Data Retention

- Staging records: Retained until normalized
- Normalized data: Project-defined retention
- Audit logs: Recommended 1 year minimum

## Incident Response

In case of a security incident:

1. **Contain**: Disable affected API keys immediately
2. **Assess**: Review audit logs for scope of impact
3. **Notify**: Inform affected parties as required
4. **Remediate**: Apply fixes and rotate credentials
5. **Review**: Post-incident analysis and documentation

## Compliance Checklist

- [ ] API keys rotated every 90 days
- [ ] Dependencies audited monthly (`npm audit`)
- [ ] Audit logs reviewed weekly
- [ ] Access controls reviewed quarterly
- [ ] Security policy reviewed annually

## Contact

For security-related inquiries, please use the GitHub Security tab or contact the maintainers directly.

---

*Last updated: January 2026*
*Aligned with: ISO 27001:2022*
