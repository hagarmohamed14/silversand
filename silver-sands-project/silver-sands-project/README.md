# Silver Sands – Smart Coastal City Platform (Vite + React project)

## Folder structure
    index.html          – page shell (loads Three.js from a CDN)
    package.json        – dependencies and scripts
    vite.config.js
    src/
      main.jsx          – entry point
      App.jsx           – the whole dashboard (all 8 tabs)
      styles.css        – light / dark themes (ivory-champagne-navy identity)
      images.js         – imports every photo/logo so Vite bundles them
      assets/img/       – all 56 photos and logos  <-- must be uploaded too!

## Run locally (PowerShell)
    npm install
    npm run dev

## Deploy on Vercel
1. Push the WHOLE folder to GitHub (src/assets/img must be included):
       git init
       git add .
       git commit -m "Silver Sands dashboard"
       git branch -M main
       git remote add origin https://github.com/hagarmohamed14/silver-sands.git
       git push -u origin main
2. vercel.com -> Add New -> Project -> import the repository.
3. Settings (auto-detected): Framework Preset = Vite · Build Command = npm run build · Output Directory = dist.
4. Deploy.

Or with the CLI:  npm i -g vercel  ->  vercel --prod

## Notes
- All data is simulated demo data; camera feeds are labelled SIMULATED.
- Three.js (r128) and the fonts load from CDNs, so visitors need internet access.
