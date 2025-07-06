# Deployment Guide

## GitHub Pages Deployment

This repository is configured for automatic deployment to GitHub Pages.

### Automatic Deployment

1. **Push to main branch**: Any push to the `main` branch triggers automatic deployment
2. **GitHub Actions**: The workflow in `.github/workflows/deploy.yml` handles the deployment
3. **Access URL**: Once deployed, the app will be available at:
   - `https://[username].github.io/kaspa-file-storage-v2/`

### Manual Setup (First Time)

1. Go to your repository on GitHub
2. Navigate to Settings → Pages
3. Under "Build and deployment":
   - Source: Select "GitHub Actions"
4. The first deployment will start automatically after pushing

### File Structure for Deployment

```
/
├── index.html          # Redirect page (GitHub Pages entry point)
├── src/
│   ├── index.html      # Main application
│   ├── kaspa-core.js   # Required JavaScript
│   ├── kaspa-core_bg.wasm # Required WASM file
│   └── txid-miner-worker.js # Web Worker
└── docs/               # Documentation
```

### Important Notes

- **CORS**: The WASM file is served from the same origin, avoiding CORS issues
- **MIME Types**: GitHub Pages correctly serves .wasm files with `application/wasm`
- **Relative Paths**: All imports use relative paths for compatibility

### Troubleshooting

1. **404 Error**: Ensure GitHub Pages is enabled in repository settings
2. **WASM Loading Error**: Check browser console for CORS issues
3. **Blank Page**: Verify all files are committed and pushed

### Local Testing

To test the deployment locally:

```bash
# Install a simple HTTP server
npm install -g http-server

# Navigate to the repository
cd kaspa-file-storage-v2

# Start the server
http-server -c-1

# Open http://localhost:8080 in your browser
```

### Custom Domain (Optional)

1. Add a `CNAME` file to the root with your domain
2. Configure DNS settings with your domain provider
3. Enable HTTPS in GitHub Pages settings

### Monitoring Deployment

- Check Actions tab in GitHub for deployment status
- Green checkmark indicates successful deployment
- Click on the workflow run for detailed logs