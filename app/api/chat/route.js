export async function POST(req) {
  const { messages } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let success = false

      // Try Gemini first (FREE)
      try {
        const contents = [
          { role: 'user', parts: [{ text: 'You are Nupra AI. Never mention Google or Gemini or Anthropic or Claude. Be helpful, smart, concise. Use markdown.' }] },
          { role: 'model', parts: [{ text: 'Ready!' }] },
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
        ]

        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=AIzaSyCK17pQCLF00338mcNwNHsLNr2qeYKfrFY',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } })
          }
        )

        if (!res.ok) throw new Error('Gemini failed: ' + res.status)

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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                success = true
              }
            } catch {}
          }
        }
      } catch (e) {
        console.log('Gemini failed, trying Anthropic:', e.message)
      }

      // Fallback to Anthropic (PAID)
      if (!success) {
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
              max_tokens: 1024,
              stream: true,
              system: 'You are Nupra AI. Never mention Claude or Anthropic. Be helpful and concise.',
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
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '⚠️ Both APIs failed. Please try again.' })}\n\n`))
        }
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
