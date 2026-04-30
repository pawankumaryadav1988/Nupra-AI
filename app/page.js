'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Nupra Pro' },
  { id: 'claude-haiku-4-5-20251001', label: 'Nupra Fast' },
]
const SUGGESTIONS = [
  'Explain black holes simply',
  'Write a Python web scraper',
  'Plan a healthy weekly diet',
  'Write a bedtime story for kids',
  'Debug my JavaScript code',
  'Write a professional email',
]
const G = '#00ffc8'
const G2 = '#0066ff'
const BD = 'rgba(0,255,200,0.1)'

function InlineParts({ text }) {
  const parts = text.split(/(`[^`]+`|\*\*[\s\S]+?\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} style={{ background: 'rgba(0,255,200,0.12)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '.88em', color: G }}>{p.slice(1, -1)}</code>
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} style={{ color: '#fff' }}>{p.slice(2, -2)}</strong>
        if (p.startsWith('*') && p.endsWith('*'))
          return <em key={i}>{p.slice(1, -1)}</em>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ margin: '10px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,255,200,0.2)' }}>
      <div style={{ background: 'rgba(0,255,200,0.08)', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,255,200,0.12)' }}>
        <span style={{ fontSize: 11, color: G, fontWeight: 700, letterSpacing: 0.5 }}>{(lang || 'CODE').toUpperCase()}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? G : 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'inherit' }}>
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre style={{ background: '#030506', padding: '14px 16px', overflowX: 'auto', fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.7, color: '#7dd3fc', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function MsgContent({ text }) {
  const segments = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ t: 'text', v: text.slice(last, m.index) })
    segments.push({ t: 'code', lang: m[1] || 'code', v: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ t: 'text', v: text.slice(last) })
  return (
    <div>
      {segments.map((seg, si) => {
        if (seg.t === 'code') return <CodeBlock key={si} lang={seg.lang} code={seg.v} />
        return (
          <div key={si}>
            {seg.v.split('\n').map((line, li) => {
              if (!line.trim()) return <div key={li} style={{ height: 5 }} />
              const h1 = line.match(/^# (.+)/), h2 = line.match(/^## (.+)/), h3 = line.match(/^### (.+)/)
              if (h1) return <div key={li} style={{ fontWeight: 700, fontSize: '1.35em', margin: '12px 0 4px', color: G }}><InlineParts text={h1[1]} /></div>
              if (h2) return <div key={li} style={{ fontWeight: 700, fontSize: '1.18em', margin: '10px 0 4px', color: G }}><InlineParts text={h2[1]} /></div>
              if (h3) return <div key={li} style={{ fontWeight: 700, fontSize: '1.05em', margin: '8px 0 3px', color: G }}><InlineParts text={h3[1]} /></div>
              const bull = line.match(/^[-*] (.+)/)
              if (bull) return <div key={li} style={{ display: 'flex', gap: 8, marginBottom: 3 }}><span style={{ color: G, flexShrink: 0 }}>•</span><span><InlineParts text={bull[1]} /></span></div>
              const num = line.match(/^(\d+)\. (.+)/)
              if (num) return <div key={li} style={{ display: 'flex', gap: 8, marginBottom: 3 }}><span style={{ color: G, flexShrink: 0 }}>{num[1]}.</span><span><InlineParts text={num[2]} /></span></div>
              const bq = line.match(/^> (.+)/)
              if (bq) return <div key={li} style={{ borderLeft: `3px solid ${G}`, paddingLeft: 12, marginBottom: 4, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}><InlineParts text={bq[1]} /></div>
              return <div key={li} style={{ marginBottom: 2 }}><InlineParts text={line} /></div>
            })}
          </div>
        )
      })}
    </div>
  )
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: G, animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </div>
  )
}

const AvatarAI   = { background: 'linear-gradient(135deg,rgba(0,255,200,0.18),rgba(0,102,255,0.18))', border: '1px solid rgba(0,255,200,0.28)', color: G }
const AvatarUser = { background: 'linear-gradient(135deg,rgba(0,102,255,0.28),rgba(0,255,200,0.1))', border: '1px solid rgba(0,102,255,0.28)', color: '#8ab4ff' }

export default function Home() {
  const [convs,       setConvs]       = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [streaming,   setStreaming]   = useState('')
  const [model,       setModel]       = useState(MODELS[0].id)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQ,     setSearchQ]     = useState('')
  const [searchOpen,  setSearchOpen]  = useState(false)
  const bottomRef = useRef(null)
  const taRef     = useRef(null)

  useEffect(() => {
    initApp()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function initApp() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) throw error

      if (data && data.length > 0) {
        setConvs(data)
        setActiveId(data[0].id)
        const { data: msgs } = await supabase
          .from('messages').select('*')
          .eq('conversation_id', data[0].id)
          .order('created_at')
        setMessages(msgs || [])
      } else {
        await createNewChat()
      }
    } catch (e) {
      console.error('initApp error:', e)
    }
  }

  async function createNewChat() {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: 'New Chat' })
      .select()
      .single()
    if (error) { console.error('createNewChat error:', error); return null }
    setConvs(p => [data, ...p])
    setActiveId(data.id)
    setMessages([])
    return data.id
  }

  async function selectConv(id) {
    setActiveId(id)
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')
    setMessages(data || [])
  }

  async function deleteConv(id, e) {
    e.stopPropagation()
    await supabase.from('conversations').delete().eq('id', id)
    const rest = convs.filter(c => c.id !== id)
    setConvs(rest)
    if (activeId === id) {
      if (rest.length) { setActiveId(rest[0].id); selectConv(rest[0].id) }
      else { await createNewChat() }
    }
  }

  const send = useCallback(async (txt) => {
    const text = (txt || input).trim()
    if (!text || loading) return

    // Make sure we have an active conversation
    let convId = activeId
    if (!convId) {
      convId = await createNewChat()
      if (!convId) return
    }

    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    // Save user message to Supabase
    const { data: userMsg, error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, role: 'user', content: text })
      .select()
      .single()

    if (msgError) { console.error('msg insert error:', msgError); return }

    // Update title if first message
    if (convs.find(c => c.id === convId)?.title === 'New Chat') {
      const newTitle = text.slice(0, 42)
      await supabase.from('conversations').update({ title: newTitle, updated_at: new Date().toISOString() }).eq('id', convId)
      setConvs(p => p.map(c => c.id === convId ? { ...c, title: newTitle } : c))
    }

    const allMsgs = [...messages, userMsg]
    setMessages(allMsgs)
    setLoading(true)
    setStreaming('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMsgs, conversationId: convId, model }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buf  = ''

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
            const t = parsed.text || parsed.delta?.text || ''
            if (t) { full += t; setStreaming(full) }
          } catch {}
        }
      }

      // Reload messages from DB
      const { data: freshMsgs } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at')
      setMessages(freshMsgs || [])
      setStreaming('')
    } catch (err) {
      console.error('send error:', err)
      setMessages(p => [...p, { id: Date.now(), role: 'assistant', content: '⚠️ Error: ' + err.message }])
      setStreaming('')
    }

    setLoading(false)
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
  }, [input, messages, loading, activeId, model, convs])

  async function handleRetry(idx) {
    if (loading) return
    const cut = messages.slice(0, idx)
    const toDelete = messages.slice(idx).map(m => m.id).filter(id => typeof id === 'string')
    if (toDelete.length) await supabase.from('messages').delete().in('id', toDelete)
    setMessages(cut)
    const lastUser = cut.filter(m => m.role === 'user').pop()
    if (lastUser) send(lastUser.content)
  }

  function handleEdit(content) {
    setInput(content)
    if (taRef.current) { taRef.current.focus(); taRef.current.style.height = 'auto'; taRef.current.style.height = Math.min(taRef.current.scrollHeight, 190) + 'px' }
  }

  function exportChat() {
    if (!messages.length) return
    const txt = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
    a.download = `Nupra-chat.txt`
    a.click()
  }

  const filtered = searchQ ? messages.filter(m => m.content?.toLowerCase().includes(searchQ.toLowerCase())) : messages
  const hasInput = input.trim()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,200,0.4)}50%{box-shadow:0 0 0 8px rgba(0,255,200,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(0,255,200,0.2);border-radius:4px}
        .msg-row:hover .msg-acts{opacity:1!important}
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: sidebarOpen ? 258 : 0, minWidth: sidebarOpen ? 258 : 0, transition: 'all .28s cubic-bezier(.4,0,.2,1)', overflow: 'hidden', background: '#05080b', borderRight: `1px solid ${BD}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 14px 12px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,rgba(0,255,200,0.2),rgba(0,102,255,0.2))', border: '1.5px solid rgba(0,255,200,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: G, flexShrink: 0 }}>N</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, background: `linear-gradient(135deg,${G},${G2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Nupra AI</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Next-gen Intelligence</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 10, color: G, background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.25)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>BETA</div>
        </div>

        <div style={{ padding: '10px 10px 4px', flexShrink: 0 }}>
          <button onClick={createNewChat} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(0,255,200,0.1),rgba(0,102,255,0.07))', border: '1px solid rgba(0,255,200,0.22)', color: G, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>+</span> New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '10px 5px 4px' }}>Recents</div>
          {convs.map(c => (
            <div key={c.id} onClick={() => selectConv(c.id)}
              style={{ padding: '9px 10px', borderRadius: 8, cursor: 'pointer', background: c.id === activeId ? 'rgba(0,255,200,0.08)' : 'transparent', border: `1px solid ${c.id === activeId ? 'rgba(0,255,200,0.2)' : 'transparent'}`, fontSize: 13, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6, color: c.id === activeId ? G : 'rgba(255,255,255,0.55)', transition: 'all .15s' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
              <span onClick={e => deleteConv(c.id, e)} style={{ opacity: 0, fontSize: 11, padding: '0 3px', flexShrink: 0 }}
                onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0}>✕</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 12px 16px', borderTop: `1px solid ${BD}`, flexShrink: 0 }}>
          <div style={{ padding: '12px', borderRadius: 12, background: `linear-gradient(135deg,rgba(0,255,200,0.07),rgba(0,102,255,0.05))`, border: `1px solid ${BD}` }}>
            <div style={{ fontSize: 11, color: G, fontWeight: 700, letterSpacing: 0.5 }}>✦ NUPRA PRO</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, lineHeight: 1.4 }}>Unlimited messages & advanced models</div>
            <button style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 9, background: `linear-gradient(135deg,${G},${G2})`, border: 'none', color: '#000', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Upgrade Free →</button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BD}`, background: 'rgba(8,12,16,.96)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 19 }}>☰</button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <select value={model} onChange={e => setModel(e.target.value)} style={{ background: 'rgba(0,255,200,0.06)', border: `1px solid ${BD}`, color: G, padding: '6px 16px', borderRadius: 20, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', outline: 'none', fontWeight: 700 }}>
              {MODELS.map(m => <option key={m.id} value={m.id} style={{ background: '#0a0e12' }}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSearchOpen(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: '4px 6px', borderRadius: 6 }}>🔍</button>
            <button onClick={exportChat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: '4px 6px', borderRadius: 6 }}>↗</button>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Online</span>
          </div>
        </div>

        {/* Search */}
        {searchOpen && (
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BD}`, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(8,12,16,.9)' }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 Search messages..."
              autoFocus
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BD}`, borderRadius: 9, padding: '7px 12px', color: '#e0f0ea', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            <button onClick={() => { setSearchOpen(false); setSearchQ('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
          {messages.length === 0 && !streaming ? (
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 22px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px', background: 'linear-gradient(135deg,rgba(0,255,200,0.14),rgba(0,102,255,0.14))', border: '1.5px solid rgba(0,255,200,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, color: G, boxShadow: '0 0 40px rgba(0,255,200,0.12)' }}>N</div>
              <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 800, letterSpacing: -0.7, background: `linear-gradient(135deg,#fff 30%,${G})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Meet Nupra AI</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 32px', fontSize: 15, lineHeight: 1.7 }}>Your intelligent companion — powered by real-time AI</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,255,200,0.1)', borderRadius: 11, padding: '13px 14px', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,200,0.07)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: G, marginRight: 5, fontSize: 10 }}>→</span>{s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 18px', display: 'flex', flexDirection: 'column' }}>
              {filtered.map((msg, idx) => (
                <div key={msg.id || idx} className="msg-row" style={{ display: 'flex', flexDirection: msg.role === 'assistant' ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 11, marginBottom: 10, animation: 'fadeUp .28s ease forwards' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, ...(msg.role === 'assistant' ? AvatarAI : AvatarUser) }}>
                    {msg.role === 'assistant' ? 'N' : 'U'}
                  </div>
                  <div style={{ maxWidth: '82%', minWidth: 0 }}>
                    {msg.role === 'assistant' && <div style={{ fontSize: 10, color: G, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>NUPRA</div>}
                    <div style={{ padding: '13px 16px', fontSize: 14.5, lineHeight: 1.78, ...(msg.role === 'assistant' ? { borderRadius: '4px 15px 15px 15px', background: 'var(--card)', border: `1px solid ${BD}` } : { borderRadius: '15px 15px 4px 15px', background: 'linear-gradient(135deg,rgba(0,102,255,0.22),rgba(0,255,200,0.08))', border: '1px solid rgba(0,102,255,0.28)' }) }}>
                      {msg.role === 'assistant' ? <MsgContent text={msg.content || ''} /> : (msg.content || '')}
                    </div>
                    <div className="msg-acts" style={{ display: 'flex', gap: 2, marginTop: 5, opacity: 0, transition: 'opacity .2s' }}>
                      {msg.role === 'assistant' ? (
                        <>
                          <button onClick={() => { navigator.clipboard.writeText(msg.content) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '3px 8px', borderRadius: 5, fontFamily: 'inherit' }}>⎘ Copy</button>
                          <button onClick={() => handleRetry(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '3px 8px', borderRadius: 5, fontFamily: 'inherit' }}>↻ Retry</button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit(msg.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '3px 8px', borderRadius: 5, fontFamily: 'inherit' }}>✏ Edit</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {streaming && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 10, animation: 'fadeUp .28s ease forwards' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginTop: 2, ...AvatarAI, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>N</div>
                  <div style={{ maxWidth: '82%' }}>
                    <div style={{ fontSize: 10, color: G, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>NUPRA</div>
                    <div style={{ padding: '13px 16px', fontSize: 14.5, lineHeight: 1.78, borderRadius: '4px 15px 15px 15px', background: 'var(--card)', border: `1px solid ${BD}` }}>
                      <MsgContent text={streaming} />
                      <span style={{ display: 'inline-block', width: 2, height: '1em', background: G, marginLeft: 2, animation: 'blink .7s infinite', verticalAlign: 'text-bottom' }} />
                    </div>
                  </div>
                </div>
              )}

              {loading && !streaming && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, ...AvatarAI, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>N</div>
                  <div>
                    <div style={{ fontSize: 10, color: G, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>NUPRA</div>
                    <div style={{ padding: '13px 16px', borderRadius: '4px 15px 15px 15px', background: 'var(--card)', border: `1px solid ${BD}` }}><Dots /></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 18px 18px', background: 'rgba(8,12,16,.97)', borderTop: `1px solid ${BD}`, flexShrink: 0 }}>
          <div style={{ maxWidth: 740, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(0,255,200,0.15)', borderRadius: 16, padding: '10px 12px', transition: 'border-color .2s, box-shadow .2s' }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(0,255,200,0.4)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,255,200,0.1)' }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(0,255,200,0.15)'; e.currentTarget.style.boxShadow = 'none' }}>
              <textarea ref={taRef} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 190) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Message Nupra..." rows={1}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e0f0ea', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.6, resize: 'none', maxHeight: 190, padding: '4px 8px' }} />
              <button onClick={() => send()} disabled={!hasInput || loading}
                style={{ width: 36, height: 36, borderRadius: 9, border: 'none', flexShrink: 0, cursor: hasInput && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, transition: 'all .2s', ...(hasInput && !loading ? { background: `linear-gradient(135deg,${G},${G2})`, color: '#000', boxShadow: '0 4px 15px rgba(0,255,200,0.38)' } : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }) }}>↑</button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', margin: '7px 0 0' }}>Nupra AI · Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}
