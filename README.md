# ProResume AI

AI-powered professional resume builder.

## Deploy with Netlify

This is a static site — no build step required. Connect the repo to Netlify and deploy in a few clicks.

### One-time setup

1. Sign in at [app.netlify.com](https://app.netlify.com)
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** and select this repository (`rextest84-source/proresume-ai`)
4. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`
5. Click **Deploy site**

Every push to `main` will trigger an automatic redeploy.

### Local preview

Open `index.html` in a browser, or run:

```bash
npx serve .
```
