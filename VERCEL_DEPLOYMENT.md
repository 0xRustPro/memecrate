# Vercel Deployment Guide

## Fixing Mixed Content Errors (HTTPS/HTTP)

When deploying to Vercel, the frontend is served over HTTPS, but if your backend API is using HTTP, you'll get mixed content errors.

## Solution Options

### Option 1: Set Backend API URL (Recommended)

Set the `VITE_API_URL` environment variable in Vercel to point to your HTTPS backend:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-domain.com` (or `https://api.yourdomain.com`)
   - **Environment**: Production, Preview, Development (as needed)

### Option 2: Use Relative URLs (If Backend is on Same Domain)

If your backend is deployed on the same domain (e.g., using Vercel API routes or a proxy), you can use relative URLs:

1. Add environment variable:
   - **Name**: `VITE_USE_RELATIVE_API`
   - **Value**: `true`
   - **Environment**: Production, Preview, Development

### Option 3: Deploy Backend with HTTPS

Make sure your backend is also served over HTTPS. You can:
- Deploy backend to a service that provides HTTPS (Railway, Render, Fly.io, etc.)
- Use a reverse proxy (nginx, Cloudflare, etc.)
- Use Vercel Serverless Functions for your API

## Environment Variables for Vercel

Add these in your Vercel project settings:

### Required (Choose one approach):

**Approach A - Direct Backend URL:**
```
VITE_API_URL=https://your-backend-api.com
```

**Approach B - Relative URLs:**
```
VITE_USE_RELATIVE_API=true
```

### Optional (if using custom backend host/port):
```
VITE_BACKEND_HOST=api.yourdomain.com
VITE_BACKEND_PORT=443
```

## How It Works

The `getApiUrl()` function in `src/services/api.ts` will:
1. First check for `VITE_API_URL` (highest priority)
2. In development (localhost), use `http://localhost:3001`
3. In production, detect the protocol (HTTPS) and use it for backend requests
4. If `VITE_USE_RELATIVE_API=true`, use relative URLs (same protocol as frontend)

## Testing

After deploying:
1. Check browser console for "API URL configured as: ..."
2. Verify it shows HTTPS URL in production
3. Check Network tab to ensure API requests use HTTPS

## Troubleshooting

If you still see mixed content errors:
1. Check that `VITE_API_URL` is set correctly in Vercel
2. Verify your backend supports HTTPS
3. Check browser console for the actual API URL being used
4. Ensure CORS is configured on your backend to allow requests from your Vercel domain

