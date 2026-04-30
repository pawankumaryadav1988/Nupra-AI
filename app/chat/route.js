export async function POST(req) {
  const { messages, conversationId } = await req.json()

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  const systemPrompt = 'You are Nupra, an advanced AI assistant by Nupra AI. Never mention Google or Gemini. Be helpful, smart, and concise. Use markdown for formatting.'

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  // Add system prompt as first user message
  contents.unshift({
    role: 'user',
    parts: [{ text: systemPrompt }]
  }, {
    role: 'model', 
    parts: [{ text: 'Understood! I am Nupra, ready to help.' }]
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
              }
            })
          }
        )

        const reader = response.body.getReader()
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
                fullText += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
              }
            } catch {}
          }
        }

        // Save to Supabase
        if (conversationId && fullText) {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          )
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullText,
          })
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
