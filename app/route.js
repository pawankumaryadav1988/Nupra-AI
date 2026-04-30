export async function POST(req) {
  const { messages } = await req.json()
  const GEMINI_API_KEY = 'AIzaSyCK17pQCLF00338mcNwNHsLNr2qeYKfrFY'
  const contents = [
    { role: 'user', parts: [{ text: 'You are Nupra AI. Never mention Google or Gemini. Be helpful and concise. Use markdown.' }] },
    { role: 'model', parts: [{ text: 'Ready!' }] },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  ]
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } }) }
        )
        if (!res.ok) throw new Error(await res.text())
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === '[DONE]') continue
            try {
              const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            } catch {}
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '⚠️ ' + err.message })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}
