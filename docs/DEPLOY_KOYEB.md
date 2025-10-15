# Deploying to Koyeb (Staging Environment)

This guide walks you through deploying the Umrah Hajj Real-time backend API to Koyeb's cloud platform.

## Prerequisites

- Koyeb account (sign up at https://www.koyeb.com)
- GitHub repository connected to Koyeb
- Neon Postgres database (or any PostgreSQL provider)
- Environment variables prepared (see [API_ENV_VARS.md](./API_ENV_VARS.md))

## Step 1: Prepare Database

1. Create a Neon Postgres database at https://neon.tech
2. Copy the connection string (format: `postgresql://user:pass@host:5432/db?sslmode=require`)
3. Save this for use in environment variables

## Step 2: Connect GitHub Repository to Koyeb

1. Log in to your Koyeb dashboard
2. Click **Create App** or **New Service**
3. Select **GitHub** as the deployment source
4. Authorize Koyeb to access your GitHub repositories
5. Select your repository: `umrah-hajj-realtime`
6. Choose the branch you want to deploy (e.g., `main` or `deploy/koyeb-setup`)

## Step 3: Configure Build Settings

### Docker Build Configuration

Since we're using a multi-stage Dockerfile, configure as follows:

- **Builder**: Docker
- **Dockerfile path**: `apps/backend/Dockerfile`
- **Docker build context**: Repository root (`.`)
- **Build command**: _(Leave empty - Dockerfile handles this)_
- **Run command**: _(Leave empty - Dockerfile CMD handles this)_

### Port Configuration

- **Port**: The app automatically reads `PORT` from environment variables
- Koyeb will inject `PORT` automatically (typically `8000`)
- Health check endpoint: `/metrics/healthz`

## Step 4: Set Environment Variables

In the Koyeb dashboard, navigate to **Environment Variables** and add the following:

### Required Environment Variables

```bash
# Application Environment
NODE_ENV=production

# Server Port (Koyeb injects this automatically, but can be overridden)
PORT=8000

# Message Pack Protocol (optional, off by default)
ENABLE_MSGPACK=false

# Prayer Calculation Method
PRAYER_DEFAULT_METHOD=UmmAlQura

# Authentication Mode
AUTH_MODE=mock
# For Supabase JWT mode, also set:
# SUPABASE_JWT_JWKS=https://your-supabase-project.supabase.co/auth/v1/jwks

# CORS Configuration
CORS_ORIGINS=https://YOUR_APP_NAME.koyeb.app
ALLOWED_ORIGINS=https://YOUR_APP_NAME.koyeb.app

# WebSocket Origin (strict enforcement)
WS_ORIGIN=https://YOUR_APP_NAME.koyeb.app

# Database Connection
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**IMPORTANT**: Replace placeholders:
- `YOUR_APP_NAME` with your actual Koyeb app name
- `USER`, `PASSWORD`, `HOST`, `DATABASE` with your Neon/Postgres credentials

### Optional Environment Variables

```bash
# Audit Logging
AUDIT_LOGGING_ENABLED=true

# Rate Limiting (for AI voice tokens)
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=5
```

For complete documentation, see [API_ENV_VARS.md](./API_ENV_VARS.md).

## Step 5: Configure Health Checks

Koyeb provides automatic health checks. Configure as follows:

- **Health check path**: `/metrics/healthz`
- **Health check port**: Same as app port (automatically detected)
- **Initial delay**: 40 seconds (allows Prisma to initialize)
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Failure threshold**: 3

## Step 6: Deploy

1. Review all settings
2. Click **Deploy**
3. Koyeb will:
   - Clone your repository
   - Build the Docker image using the multi-stage Dockerfile
   - Run Prisma migrations (if configured in startup script)
   - Start the application
   - Expose it at `https://YOUR_APP_NAME.koyeb.app`

## Step 7: Verify Deployment

### Test Health Endpoint

```bash
curl https://YOUR_APP_NAME.koyeb.app/metrics/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### Test Swagger Documentation

Open in browser:
```
https://YOUR_APP_NAME.koyeb.app/docs
```

You should see the interactive Swagger UI with all API endpoints documented.

### Test WebSocket Connection

```bash
# Install wscat if not already installed
npm install -g wscat

# Connect to WebSocket (requires JWT token in query param)
wscat -c "wss://YOUR_APP_NAME.koyeb.app/ws?token=YOUR_JWT_TOKEN"
```

## Step 8: Monitor and Debug

### View Logs

In the Koyeb dashboard:
1. Navigate to your service
2. Click **Logs** tab
3. Monitor real-time logs for errors or issues

### Common Issues

#### Build Failures

**Problem**: Docker build fails with "Cannot find module"

**Solution**: Ensure `pnpm-lock.yaml` is committed and `pnpm install --frozen-lockfile` is used in Dockerfile

#### Health Check Failures

**Problem**: Koyeb shows "Unhealthy" status

**Solution**:
1. Check logs for database connection errors
2. Verify `DATABASE_URL` is correct and database is accessible
3. Ensure Prisma migrations have run successfully

#### CORS Errors

**Problem**: Frontend can't connect, CORS errors in browser

**Solution**:
1. Verify `CORS_ORIGINS` matches your frontend domain exactly
2. Ensure `ALLOWED_ORIGINS` includes your domain
3. Check `NODE_ENV=production` is set

#### WebSocket Connection Rejected

**Problem**: WebSocket handshake fails with 403

**Solution**:
1. Verify `WS_ORIGIN` matches the frontend domain exactly
2. Ensure JWT token is valid and included in `?token=...` query param
3. Check logs for origin validation messages

## Step 9: Set Up Custom Domain (Optional)

1. In Koyeb dashboard, go to **Domains**
2. Click **Add Custom Domain**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed by Koyeb
5. Update `CORS_ORIGINS` and `WS_ORIGIN` to match new domain

## Step 10: Configure CI/CD (Optional)

Koyeb automatically redeploys when you push to the connected branch. To control deployments:

1. Use branch-based deployments (e.g., `main` for production, `staging` for testing)
2. Set up GitHub Actions to run tests before merge
3. Use Koyeb's API to trigger deployments programmatically

## Rollback

If a deployment fails:

1. Go to **Deployments** in Koyeb dashboard
2. Find the last working deployment
3. Click **Redeploy** on that version

## Pricing Considerations

- Koyeb offers a free tier suitable for staging/testing
- Production workloads may require paid plans
- Monitor usage at: https://app.koyeb.com/billing

## Next Steps

- Set up monitoring and alerting
- Configure database backups
- Review [Security Headers documentation](./SECURITY_HEADERS.md)
- Share Swagger docs with 3D/Unity team: [Unity Integration Guide](./UNITY_INTEGRATION_GUIDE.md)

## Support

- Koyeb Documentation: https://www.koyeb.com/docs
- Koyeb Community: https://community.koyeb.com
- Project Issues: https://github.com/YOUR_ORG/umrah-hajj-realtime/issues
