export async function POST(req) {
  const { messages } = await req.json()

  const systemMsg = 'You are Nupra AI. Never mention Google, Gemini, Anthropic, Claude, or OpenAI. Be helpful, smart and concise. Use markdown.'

  // ── 1. GEMINI (FREE) ──────────────────────────────────
  try {
    const contents = [
      { role: 'user', parts: [{ text: systemMsg }] },
      { role: 'model', parts: [{ text: 'Got it!' }] },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    ]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } }) }
    )
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (res.ok && text) {
      console.log('✅ Gemini responded')
      return Response.json({ text, source: 'gemini' })
    }
    throw new Error(data.error?.message || 'Gemini failed')
  } catch (e) {
    console.log('❌ Gemini failed:', e.message)
  }

  // ── 2. ANTHROPIC (FALLBACK) ───────────────────────────
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemMsg,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text
    if (res.ok && text) {
      console.log('✅ Anthropic responded')
      return Response.json({ text, source: 'anthropic' })
    }
    throw new Error(data.error?.message || 'Anthropic failed')
  } catch (e) {
    console.log('❌ Anthropic failed:', e.message)
  }

  // ── 3. OPENAI (LAST RESORT) ───────────────────────────
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMsg },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (res.ok && text) {
      console.log('✅ OpenAI responded')
      return Response.json({ text, source: 'openai' })
    }
    throw new Error(data.error?.message || 'OpenAI failed')
  } catch (e) {
    console.log('❌ OpenAI failed:', e.message)
  }

  // ── ALL FAILED ────────────────────────────────────────
  return Response.json({ error: 'All AI providers failed. Please try again.' }, { status: 500 })
}
