# Security Policy

## Production Deployment Checklist

### Environment Variables
- [ ] Never commit `.env` files to the repository
- [ ] Use `.env.example` as a template
- [ ] Generate strong, unique JWT secrets for production
- [ ] Rotate secrets regularly
- [ ] Use environment-specific configurations

### Authentication & Authorization
- [ ] OAuth 2.1 implementation with PKCE
- [ ] JWT tokens expire after 24 hours
- [ ] Session isolation between users
- [ ] Rate limiting on all endpoints
- [ ] CORS properly configured

### Data Protection
- [ ] No sensitive data logged
- [ ] Reddit tokens encrypted in JWT payload
- [ ] Session data cleaned up after timeout
- [ ] Request size limits enforced

### Network Security
- [ ] HTTPS required in production
- [ ] Secure headers configured
- [ ] No debug endpoints exposed
- [ ] Health check endpoint doesn't leak sensitive info

### Dependencies
- [ ] Regular dependency updates
- [ ] Security audit with `npm audit`
- [ ] No vulnerable dependencies
- [ ] Minimal production dependencies

## Reporting Security Vulnerabilities

Please report security vulnerabilities to: security@systemprompt.io

Do NOT create public GitHub issues for security vulnerabilities.

## Security Features

### Rate Limiting
- 100 requests per minute per IP
- Configurable limits per endpoint

### Input Validation
- All inputs validated with Zod schemas
- Strict type checking
- SQL injection protection (N/A - no database)
- XSS protection through proper encoding

### Session Management
- Unique session IDs per connection
- Automatic session cleanup after 1 hour
- No session fixation vulnerabilities

### OAuth Security
- PKCE required for all OAuth flows
- State parameter validation
- Redirect URI whitelist
- Time-limited authorization codes

## Production Configuration

### Required Environment Variables
```bash
# Strong, unique values required
REDDIT_CLIENT_ID=<from Reddit app>
REDDIT_CLIENT_SECRET=<from Reddit app>
JWT_SECRET=<generate with: openssl rand -base64 32>

# Production URLs
OAUTH_ISSUER=https://your-domain.com
REDIRECT_URL=https://your-domain.com/oauth/reddit/callback
```

### Recommended Headers
```javascript
// Helmet.js configuration (example)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```