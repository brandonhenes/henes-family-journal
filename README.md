# henes-family-journal

A live family memory journal that reads from Supabase. Deployed as a static site.

## Deploy to Vercel (fastest)

1. Push this folder to a new GitHub repo (e.g., `henes-family-journal`)
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "New Project", select the repo
4. Vercel auto-detects Vite. Click "Deploy"
5. Done. You'll get a URL like `henes-family-journal.vercel.app`

## Deploy to Netlify (alternative)

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com), sign in with GitHub
3. "Add new site" > "Import an existing project"
4. Select the repo
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Deploy

## Local development

```
npm install
npm run dev
```

## Custom domain (optional)

Both Vercel and Netlify support free custom domains. In the project settings, add your domain and update DNS.
