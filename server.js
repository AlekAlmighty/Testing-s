const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;

let openai = null;
if (process.env.OPENAI_API_KEY) {
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  openai = new OpenAIApi(configuration);
}

// API endpoint: POST /api/ai/assess
// Expects JSON payload with fields like { currentSmoker, years, cigsPerDay, motivation, age, gender }
app.post('/api/ai/assess', async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload) return res.status(400).json({ error: 'Missing request body' });

    if (!openai) return res.status(503).json({ error: 'AI not configured on server. Set OPENAI_API_KEY in environment.' });

    // Build a concise prompt for the model
    const userInfo = {
      currentSmoker: payload.currentSmoker || 'unknown',
      years: payload.years != null ? payload.years : 'unknown',
      cigsPerDay: payload.cigsPerDay != null ? payload.cigsPerDay : 'unknown',
      motivation: payload.motivation || 'unknown',
      age: payload.age || 'unknown',
      gender: payload.gender || 'unknown'
    };

    const systemInstruction = `You are a concise, non-judgmental health coach. Using the user information, produce a short JSON response with keys: feedback (1-2 short paragraphs), riskLevel (Low|Moderate|High), and recommendations (array of up to 3 short actionable suggestions). Avoid medical diagnoses; recommend seeing a professional when appropriate.`;

    const userPrompt = `User data:\n${JSON.stringify(userInfo, null, 2)}\nRespond only in JSON.`;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const text = response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content;

    // Try to parse JSON; fall back to raw text
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = { feedback: text };
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Error in /api/ai/assess:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Serve static app files from the current directory (so your index.html is reachable)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
