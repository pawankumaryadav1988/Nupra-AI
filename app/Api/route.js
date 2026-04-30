import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  const { messages, conversationId, model, systemPrompt } = await req.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const response = await anthropic.messages.stream({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt ||
            'You are Nupra, a next-generation AI assistant built by Nupra AI. Never say you are Claude or made by Anthropic. Be helpful, smart, and concise. Use markdown formatting for code, lists, and headings.',
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        })

        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            fullText += chunk.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        // Save assistant reply to Supabase
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullText,
        })
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
        )
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
