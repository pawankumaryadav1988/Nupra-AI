export async function POST(req) {
  const { messages } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': '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',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            stream: true,
            system: 'You are Nupra AI. Never mention Claude or Anthropic. Be helpful, smart and concise. Use markdown.',
            messages: messages.map(m => ({ role: m.role, content: m.content }))
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
              const text = parsed.delta?.text
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            } catch {}
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '⚠️ Error: ' + err.message })}\n\n`))
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
