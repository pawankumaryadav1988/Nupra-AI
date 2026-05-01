export async function POST(req) {
  const { messages } = await req.json()

  try {
    const contents = [
      { role: 'user', parts: [{ text: 'You are Nupra AI. Never mention Google or Gemini. Be helpful, smart and concise. Use markdown.' }] },
      { role: 'model', parts: [{ text: 'Got it!' }] },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    ]

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyASTVRbE7PzvawWnpG9SL_e6IRJCZSvSU8`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048, temperature: 0.7 } })
      }
    )

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!res.ok || !text) {
      return Response.json({ error: data.error?.message || 'No response' }, { status: 500 })
    }

    return Response.json({ text })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
