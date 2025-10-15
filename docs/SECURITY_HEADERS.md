# Security Headers Documentation

The Umrah Hajj Real-time API implements comprehensive security headers to protect against common web vulnerabilities.

## Overview

Security headers are configured in `src/main.ts` using Helmet middleware and custom middleware from `SecurityConfigService`.

## Headers Implemented

### Content-Security-Policy (CSP)

Prevents XSS, clickjacking, and other code injection attacks by controlling which resources can be loaded.

**Configuration** (see `src/security/security-config.service.ts`):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<random>';
  style-src 'self' 'nonce-<random>' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Key Directives**:
- `default-src 'self'`: Only load resources from same origin by default
- `script-src`: Scripts must be from same origin or have valid nonce
- `style-src`: Styles from same origin, inline styles allowed with nonce
- `img-src`: Images from same origin, data URIs, or HTTPS
- `connect-src 'self'`: XHR/fetch/WebSocket only to same origin
- `frame-ancestors 'none'`: Prevent embedding in iframes (clickjacking protection)

**Nonce Generation**: Each request generates a cryptographically random nonce for inline scripts/styles.

### HTTP Strict Transport Security (HSTS)

Forces browsers to use HTTPS for all future requests to the domain.

**Configuration**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Details**:
- `max-age=31536000`: Enforce HTTPS for 1 year (365 days)
- `includeSubDomains`: Apply to all subdomains
- `preload`: Eligible for browser HSTS preload list

**Note**: Only sent when `NODE_ENV=production` and connection is HTTPS.

### X-Content-Type-Options

Prevents MIME-sniffing attacks by forcing browsers to respect `Content-Type` headers.

**Configuration**:
```
X-Content-Type-Options: nosniff
```

**Purpose**: Stops browsers from interpreting files as a different MIME type than declared.

### X-Frame-Options

Protects against clickjacking by controlling whether the site can be embedded in frames.

**Configuration**:
```
X-Frame-Options: DENY
```

**Purpose**: Completely prevents the page from being displayed in any `<iframe>`, `<frame>`, or `<object>`.

### X-XSS-Protection

Legacy header that activates XSS filtering in older browsers.

**Configuration**:
```
X-XSS-Protection: 1; mode=block
```

**Purpose**: Blocks page rendering if XSS attack is detected (legacy support for IE/Edge Legacy).

**Note**: Modern browsers rely on CSP instead, but this provides defense-in-depth.

### Referrer-Policy

Controls how much referrer information is sent with requests.

**Configuration**:
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Behavior**:
- Same-origin requests: Send full URL as referrer
- Cross-origin HTTPS→HTTPS: Send origin only (no path)
- Cross-origin HTTPS→HTTP: Send nothing (downgrade protection)

**Purpose**: Balances privacy with legitimate analytics needs.

### Permissions-Policy (Feature-Policy)

Controls which browser features and APIs can be used.

**Configuration**:
```
Permissions-Policy:
  geolocation=(self),
  camera=(),
  microphone=(),
  payment=(),
  usb=(),
  magnetometer=(),
  gyroscope=()
```

**Granted Features**:
- `geolocation=(self)`: Only this origin can access location (needed for Qibla/prayer times)

**Blocked Features**:
- Camera, microphone, payment, USB, sensors: Not needed, explicitly blocked

**Purpose**: Reduces attack surface by disabling unnecessary browser APIs.

### Cross-Origin-Embedder-Policy

**Configuration**: Disabled (`false`)

**Reason**: WebSocket connections require flexibility in cross-origin resource loading. COEP would break WebSocket handshakes.

## Verification

### Using cURL

Test security headers with:

```bash
curl -I https://YOUR_APP.koyeb.app/metrics/healthz
```

Expected headers in response:
```
HTTP/2 200
content-security-policy: default-src 'self'; script-src 'self' 'nonce-...'; ...
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
permissions-policy: geolocation=(self), camera=(), microphone=(), ...
```

### Using securityheaders.com

1. Visit https://securityheaders.com
2. Enter your domain: `https://YOUR_APP.koyeb.app`
3. Expected grade: **A** or **A+**

### Using Mozilla Observatory

1. Visit https://observatory.mozilla.org
2. Scan your domain
3. Expected score: **90+**

## Browser Compatibility

| Header | Chrome | Firefox | Safari | Edge |
|--------|--------|---------|--------|------|
| CSP | ✅ 25+ | ✅ 23+ | ✅ 7+ | ✅ 12+ |
| HSTS | ✅ 4+ | ✅ 4+ | ✅ 7+ | ✅ 12+ |
| X-Content-Type-Options | ✅ All | ✅ All | ✅ All | ✅ All |
| X-Frame-Options | ✅ All | ✅ All | ✅ All | ✅ All |
| Referrer-Policy | ✅ 56+ | ✅ 52+ | ✅ 11.1+ | ✅ 79+ |
| Permissions-Policy | ✅ 88+ | ✅ 74+ | ✅ 15.4+ | ✅ 88+ |

## Implementation Details

### Helmet Configuration

Located in `src/main.ts`:

```typescript
app.use(helmet({
  contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy,
  hsts: securityConfig.helmet.hsts,
  xssFilter: securityConfig.helmet.xssFilter,
  noSniff: securityConfig.helmet.noSniff,
  frameguard: securityConfig.helmet.frameguard,
  referrerPolicy: securityConfig.helmet.referrerPolicy,
  crossOriginEmbedderPolicy: false, // Disabled for WebSocket compatibility
}));
```

### Custom Security Middleware

Three custom middleware functions from `SecurityConfigService`:

1. **nonceMiddleware**: Generates CSP nonce for each request
2. **hstsMiddleware**: Applies HSTS in production only
3. **securityHeadersMiddleware**: Applies Permissions-Policy and additional headers

Applied in `src/main.ts`:
```typescript
app.use(securityConfigService.nonceMiddleware);
app.use(securityConfigService.hstsMiddleware);
app.use(securityConfigService.securityHeadersMiddleware);
```

## Common Issues

### CSP Violations in Development

**Problem**: Swagger UI or dev tools blocked by CSP

**Solution**: CSP is relaxed in `NODE_ENV=development`. Check environment variable.

### HSTS Not Applied

**Problem**: `Strict-Transport-Security` header missing

**Solution**:
1. Ensure `NODE_ENV=production`
2. Verify connection is HTTPS (Koyeb handles this)
3. Check logs for HSTS middleware errors

### WebSocket Connection Blocked

**Problem**: WebSocket fails with CSP error

**Solution**: `connect-src 'self'` allows WebSocket to same origin. Ensure `WS_ORIGIN` matches your domain.

## Security Best Practices

1. **Always use HTTPS** in production (Koyeb provides this)
2. **Test headers** after each deployment
3. **Monitor CSP violations** (if using CSP reporting)
4. **Keep Helmet updated** for latest security patches
5. **Review CSP directives** periodically

## Additional Protection Layers

Beyond headers, the API implements:

- **CORS validation**: Strict origin checking (see `main.ts:42-73`)
- **WebSocket origin validation**: Rejects connections from unauthorized origins
- **Rate limiting**: AI voice token endpoint limited to 5 req/min/user
- **Input validation**: Zod schemas on all endpoints
- **JWT verification**: Supabase JWT or custom JWT with JWKS
- **Audit logging**: Security events logged for forensics
- **Log redaction**: Sensitive data (JWTs, passwords) redacted from logs

## Further Reading

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Helmet.js Documentation](https://helmetjs.github.io/)

## Related Documentation

- [API Environment Variables](./API_ENV_VARS.md)
- [Deployment Guide](./DEPLOY_KOYEB.md)
- [Unity Integration](./UNITY_INTEGRATION_GUIDE.md)
