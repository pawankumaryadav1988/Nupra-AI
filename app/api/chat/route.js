export async function POST(req) {
  const { messages } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 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',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            stream: true,
            messages: [
              { role: 'system', content: 'You are Nupra AI. Never mention OpenAI or ChatGPT or Anthropic or Claude. Be helpful, smart and concise. Use markdown.' },
              ...messages.map(m => ({ role: m.role, content: m.content }))
            ]
          })
        })

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
              const parsed = JSON.parse(raw)
              const t = parsed.choices?.[0]?.delta?.content
              if (t) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: t })}\n\n`))
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
  })
}
