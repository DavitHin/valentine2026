# Valentine 2026 (Google Drive media)

This version can load your photos/videos from a **private Google Drive folder** (shared users only),
so you don't have to store large media files inside the GitHub repo.

## What you need to configure

### 1) Create / choose a Google Drive folder
1. Create a folder in Google Drive (example: `ValentineMedia`).
2. Put your **images + videos** inside that folder (no need to keep a local `/images` folder).
3. Right-click the folder → **Share** → share **only** with the Google accounts you want (you + your wife).
   - Give **Viewer** permission.
4. Copy the folder ID:
   - Open the folder in Drive, the URL will contain `folders/<FOLDER_ID>`
   - Example: `https://drive.google.com/drive/folders/1AbC...xyz`

### 2) Create an OAuth Client ID (Google Cloud)
1. Google Cloud Console → **APIs & Services** → **Library** → Enable **Google Drive API**
2. **APIs & Services** → **OAuth consent screen**
   - User type: **External** (or Internal if you use Google Workspace)
   - Publishing status: **Testing**
   - Add **Test users**: your email + your wife’s email (important)
3. **Credentials** → **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://davithin.github.io`  (GitHub Pages domain)
     - `http://localhost:8888`       (optional PC-only local testing)
   - Copy the **Client ID**.

### 3) Put your values in `script.js`
Open `script.js` and set:

```js
CONFIG.mediaSource = "drive";
CONFIG.drive.clientId = "YOUR_CLIENT_ID.apps.googleusercontent.com";
CONFIG.drive.folderId = "YOUR_FOLDER_ID";
CONFIG.answerSink.endpoint = "YOUR_APPS_SCRIPT_WEB_APP_URL";
CONFIG.answerSink.mode = "no-cors";
```

To view submitted answers:
1. Deploy `google_apps_script.gs` as a Web App.
2. Open the Web App URL directly to read latest rows (JSON).
3. Optional: set `ADMIN_KEY` in Apps Script and open `.../exec?key=YOUR_KEY`.

Drive session behavior:
- Sign-in state is restored silently when possible.
- Session preference is kept up to 7 days (configurable in `CONFIG.driveSession.maxDays`).
- User can force logout with the **Sign out Drive** button.

## Notes / limitations
- Google OAuth **won't work from a LAN IP** like `http://192.168.x.x:8888` (phone testing),
  because Google requires allowed origins to be HTTPS and not raw IPs (except localhost).
  Use **GitHub Pages** or another HTTPS domain for phone testing.
- Videos are loaded via the Drive API and converted into a blob URL so the website can **pause the background music**
  while the video is playing. For very large videos, this means the browser may download a lot of data.

## Deploy to GitHub Pages
1. Push these files to your repo root:
   - `index.html`, `style.css`, `script.js`, `media-manifest.json`
2. Repo → **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` and folder: `/ (root)`
5. Your site will be: `https://davithin.github.io/valentine2026/`
