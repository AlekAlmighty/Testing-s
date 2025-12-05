Breathe Green — Server + AI Assessment

This folder contains a minimal Express server that serves the static front-end and exposes a simple AI endpoint used for the first-login assessment.

Files added:
- `server.js` — Express server with `POST /api/ai/assess`.
- `package.json` — scripts and dependencies.
- `.env.example` — example env file.

Quick setup (Windows PowerShell):

1. Copy `.env.example` to `.env` and add your OpenAI API key:

```powershell
copy .env.example .env
# Edit .env and replace OPENAI_API_KEY with your real key
notepad .env
```

Or set env var in the shell before running:

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

2. Install dependencies:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

4. Open the site in a browser:

- `http://localhost:3000/login.html`

Test the AI endpoint directly (example):

```powershell
curl -X POST http://localhost:3000/api/ai/assess -H "Content-Type: application/json" -d '{"currentSmoker":"yes","years":10,"cigsPerDay":10,"motivation":"medium","age":35}'
```

Security notes:
- Keep your OpenAI API key secret. Do not embed it into client-side code.
- This server approach centralizes the key on the server and prevents exposure.
- For production, add authentication, rate-limiting, input validation and logging controls.
- Consider using a serverless function (AWS Lambda, Vercel, Cloud Run) instead of a plain Express server.

If you want, I can start the server here (run `npm install` and `npm start`) or scaffold a serverless function instead.

Vercel serverless deployment (easy):

- Vercel can host your static site and serverless functions in one project. Place the file `api/ai/assess.js` at the project root (we added an example). Vercel will expose it at `/api/ai/assess`.
- To deploy quickly:
	1. Install the Vercel CLI: `npm i -g vercel` (or use the web UI via GitHub).
	2. Login: `vercel login`.
	3. From the project folder run `vercel` and follow prompts.
	4. Set your environment variable `OPENAI_API_KEY` in the Vercel dashboard (do not commit it).

Netlify (alternative):
- Use Netlify Functions (place a function in `netlify/functions/assess.js`). Netlify also supports environment variables in its dashboard.

Notes:
- The included `api/ai/assess.js` file uses `fetch` to call OpenAI. It expects `OPENAI_API_KEY` set in the environment.
- Serverless is recommended because it keeps the OpenAI key off the client and removes the need for the developer to run a long-lived server locally.
