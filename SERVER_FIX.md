# Fix for MIME Type Error

## The Error
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".
```

## Solution

### For Development (using Vite dev server):

1. **Stop the current dev server** (if running):
   ```bash
   # Press Ctrl+C in the terminal where Vite is running
   ```

2. **Clear cache and restart**:
   ```bash
   cd frontend
   rm -rf node_modules/.vite dist
   npm run dev
   ```

3. **Access the app** at: `http://170.205.31.123:5173`

### For Production (serving built files):

If you're serving the `dist` folder with a web server (nginx, Apache, etc.), you need to configure it properly:

**Nginx example:**
```nginx
server {
    listen 5173;
    server_name 170.205.31.123;
    root /root/projects/casino-project/frontend/dist;
    index index.html;

    # Serve static assets with correct MIME types
    location /assets/ {
        add_header Content-Type application/javascript;
        try_files $uri =404;
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Important**: Make sure static assets (`.js`, `.css` files) are served BEFORE the SPA fallback rule.

## Why This Happens

The error occurs when:
- The server treats JavaScript module requests as routes
- React Router or a SPA fallback returns `index.html` instead of the actual JS file
- The server doesn't have proper MIME type configuration

The Vite dev server handles this automatically, but production servers need proper configuration.

