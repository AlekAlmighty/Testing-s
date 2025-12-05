// Vercel serverless function: /api/ai/assess
// Deploy to Vercel (or any Node server that supports serverless handlers).

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const payload = req.body || {};
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
    if (!OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

    const userInfo = {
      currentSmoker: payload.currentSmoker ?? 'unknown',
      years: payload.years ?? 'unknown',
      cigsPerDay: payload.cigsPerDay ?? 'unknown',
      motivation: payload.motivation ?? 'unknown',
      age: payload.age ?? 'unknown',
      gender: payload.gender ?? 'unknown'
    };

    const system = `You are a concise, non-judgmental health coach. Using the user information, produce a short JSON response with keys: feedback (1-2 short paragraphs), riskLevel (Low|Moderate|High), and recommendations (array of up to 3 short actionable suggestions). Avoid medical diagnoses; recommend seeing a professional when appropriate.`;

    const userPrompt = `User data:\n${JSON.stringify(userInfo, null, 2)}\nRespond only in JSON.`;

    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.7
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'OpenAI error', detail: text });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? null;

    if (!text) return res.status(500).json({ error: 'No response from AI' });

    // Try to parse JSON from model output; fallback to returning the raw text as feedback
    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (err) {
      return res.json({ feedback: text });
    }
  } catch (err) {
    console.error('/api/ai/assess error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};
