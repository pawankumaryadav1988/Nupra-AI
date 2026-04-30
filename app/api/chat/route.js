export async function POST(req) {
  const { messages } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const contents = [
          { role: 'user', parts: [{ text: 'You are Nupra AI. Never mention Google or Gemini or Anthropic or Claude. Be helpful, smart, concise. Use markdown.' }] },
          { role: 'model', parts: [{ text: 'Got it! I am Nupra AI, ready to help!' }] },
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        ]

        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCK17pQCLF00338mcNwNHsLNr2qeYKfrFY',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            })
          }
        )

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, try again.'
        
        // Send in chunks to simulate streaming
        const words = text.split(' ')
        for (const word of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`))
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
