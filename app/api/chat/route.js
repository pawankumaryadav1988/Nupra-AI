export async function POST(req) {
  const { messages } = await req.json()

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: false,
        messages: [
          { role: 'system', content: 'You are Nupra AI. Never mention OpenAI or ChatGPT or Anthropic or Claude. Be helpful, smart and concise. Use markdown.' },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    })

    const data = await res.json()
    
    if (!res.ok) {
      return Response.json({ error: data.error?.message || 'API Error' }, { status: 500 })
    }

    const text = data.choices?.[0]?.message?.content || 'No response'
    return Response.json({ text })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
