'use client'
import { useState, useRef, useCallback } from 'react'

const G = '#00ffc8', G2 = '#0066ff', BD = 'rgba(0,255,200,0.1)'
const SUGGESTIONS = ['Explain black holes simply','Write a Python web scraper','Plan a healthy weekly diet','Write a bedtime story for kids']

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{margin:'10px 0',borderRadius:10,overflow:'hidden',border:'1px solid rgba(0,255,200,0.2)'}}>
      <div style={{background:'rgba(0,255,200,0.08)',padding:'6px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(0,255,200,0.12)'}}>
        <span style={{fontSize:11,color:G,fontWeight:700}}>{(lang||'CODE').toUpperCase()}</span>
        <button onClick={()=>{navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1500)}}
          style={{background:'none',border:'none',cursor:'pointer',color:copied?G:'rgba(255,255,255,0.4)',fontSize:12,fontFamily:'inherit'}}>
          {copied?'✓ Copied':'⎘ Copy'}
        </button>
      </div>
      <pre style={{background:'#030506',padding:'14px 16px',overflowX:'auto',fontFamily:'monospace',fontSize:13,lineHeight:1.7,color:'#7dd3fc',margin:0,whiteSpace:'pre-wrap'}}>
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
    segments.push({ t: 'code', lang: m[1]||'code', v: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ t: 'text', v: text.slice(last) })
  return (
    <div>{segments.map((seg,si)=>{
      if (seg.t==='code') return <CodeBlock key={si} lang={seg.lang} code={seg.v}/>
      return <div key={si}>{seg.v.split('\n').map((line,li)=>{
        if (!line.trim()) return <div key={li} style={{height:5}}/>
        const h1=line.match(/^# (.+)/),h2=line.match(/^## (.+)/),h3=line.match(/^### (.+)/)
        if (h1) return <div key={li} style={{fontWeight:700,fontSize:'1.3em',margin:'10px 0 4px',color:G}}>{h1[1]}</div>
        if (h2) return <div key={li} style={{fontWeight:700,fontSize:'1.15em',margin:'8px 0 3px',color:G}}>{h2[1]}</div>
        if (h3) return <div key={li} style={{fontWeight:700,fontSize:'1.05em',margin:'6px 0 3px',color:G}}>{h3[1]}</div>
        const bull=line.match(/^[-*] (.+)/)
        if (bull) return <div key={li} style={{display:'flex',gap:8,marginBottom:3}}><span style={{color:G}}>•</span><span>{bull[1]}</span></div>
        const num=line.match(/^(\d+)\. (.+)/)
        if (num) return <div key={li} style={{display:'flex',gap:8,marginBottom:3}}><span style={{color:G}}>{num[1]}.</span><span>{num[2]}</span></div>
        const ps=line.split(/(`[^`]+`|\*\*[\s\S]+?\*\*)/g)
        return <div key={li} style={{marginBottom:2}}>{ps.map((p,i)=>{
          if (p.startsWith('`')&&p.endsWith('`')) return <code key={i} style={{background:'rgba(0,255,200,0.12)',padding:'1px 5px',borderRadius:4,fontFamily:'monospace',fontSize:'.88em',color:G}}>{p.slice(1,-1)}</code>
          if (p.startsWith('**')&&p.endsWith('**')) return <strong key={i} style={{color:'#fff'}}>{p.slice(2,-2)}</strong>
          return <span key={i}>{p}</span>
        })}</div>
      })}</div>
    })}</div>
  )
}

function Dots() {
  return <div style={{display:'flex',gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:G,animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}</div>
}

const AvatarAI={background:'linear-gradient(135deg,rgba(0,255,200,0.18),rgba(0,102,255,0.18))',border:'1px solid rgba(0,255,200,0.28)',color:G}
const AvatarUser={background:'linear-gradient(135deg,rgba(0,102,255,0.28),rgba(0,255,200,0.1))',border:'1px solid rgba(0,102,255,0.28)',color:'#8ab4ff'}

export default function Home() {
  const [convs,setConvs]=useState([{id:'1',title:'New Chat',messages:[]}])
  const [activeId,setActiveId]=useState('1')
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [sidebarOpen,setSidebarOpen]=useState(true)
  const [searchQ,setSearchQ]=useState('')
  const [searchOpen,setSearchOpen]=useState(false)
  const bottomRef=useRef(null)
  const taRef=useRef(null)

  const getActive=()=>convs.find(c=>c.id===activeId)
  const msgs=getActive()?.messages||[]

  const newChat=()=>{
    const id=Date.now().toString()
    setConvs(p=>[{id,title:'New Chat',messages:[]},...p])
    setActiveId(id)
  }

  const delConv=(id,e)=>{
    e.stopPropagation()
    const rest=convs.filter(c=>c.id!==id)
    if (!rest.length){newChat();return}
    setConvs(rest)
    if (activeId===id) setActiveId(rest[0].id)
  }

  const send=useCallback(async(txt)=>{
    const text=(txt||input).trim()
    if (!text||loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height='auto'

    const userMsg={id:Date.now(),role:'user',content:text}
    const conv=getActive()
    const newMsgs=[...(conv?.messages||[]),userMsg]
    setConvs(p=>p.map(c=>c.id===activeId?{...c,title:c.title==='New Chat'?text.slice(0,36):c.title,messages:newMsgs}:c))
    setLoading(true)

    try {
      const res=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:newMsgs.map(m=>({role:m.role,content:m.content}))})
      })

      const data=await res.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const aiMsg={id:Date.now()+1,role:'assistant',content:data.text}
      setConvs(p=>p.map(c=>c.id===activeId?{...c,messages:[...newMsgs,aiMsg]}:c))
    } catch(err){
      const aiMsg={id:Date.now()+1,role:'assistant',content:'⚠️ Error: '+err.message}
      setConvs(p=>p.map(c=>c.id===activeId?{...c,messages:[...newMsgs,aiMsg]}:c))
    }
    setLoading(false)
  },[input,msgs,loading,activeId,convs])

  const filtered=searchQ?msgs.filter(m=>m.content?.toLowerCase().includes(searchQ.toLowerCase())):msgs

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif',background:'#080c10',color:'#d0e8e0'}}>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,200,0.4)}50%{box-shadow:0 0 0 8px rgba(0,255,200,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,255,200,0.2);border-radius:4px}
        .mrow:hover .macts{opacity:1!important}
      `}</style>

      <div style={{width:sidebarOpen?258:0,minWidth:sidebarOpen?258:0,transition:'all .28s',overflow:'hidden',background:'#05080b',borderRight:`1px solid ${BD}`,display:'flex',flexDirection:'column'}}>
        <div style={{padding:'18px 14px 12px',borderBottom:`1px solid ${BD}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,rgba(0,255,200,0.2),rgba(0,102,255,0.2))',border:'1.5px solid rgba(0,255,200,0.32)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:18,color:G,flexShrink:0}}>N</div>
          <div>
            <div style={{fontWeight:800,fontSize:16,background:`linear-gradient(135deg,${G},${G2})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Nupra AI</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Next-gen Intelligence</div>
          </div>
          <div style={{marginLeft:'auto',fontSize:10,color:G,background:'rgba(0,255,200,0.1)',border:'1px solid rgba(0,255,200,0.25)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>BETA</div>
        </div>
        <div style={{padding:'10px 10px 4px',flexShrink:0}}>
          <button onClick={newChat} style={{width:'100%',padding:'10px 14px',borderRadius:10,background:'linear-gradient(135deg,rgba(0,255,200,0.1),rgba(0,102,255,0.07))',border:'1px solid rgba(0,255,200,0.22)',color:G,fontFamily:'inherit',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18}}>+</span> New Chat
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'4px 8px'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:1.5,padding:'10px 5px 4px'}}>Recents</div>
          {convs.map(c=>(
            <div key={c.id} onClick={()=>setActiveId(c.id)}
              style={{padding:'9px 10px',borderRadius:8,cursor:'pointer',background:c.id===activeId?'rgba(0,255,200,0.08)':'transparent',border:`1px solid ${c.id===activeId?'rgba(0,255,200,0.2)':'transparent'}`,fontSize:13,marginBottom:2,display:'flex',alignItems:'center',gap:6,color:c.id===activeId?G:'rgba(255,255,255,0.55)'}}>
              <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</span>
              <span onClick={e=>delConv(c.id,e)} style={{opacity:0,fontSize:11}} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0}>✕</span>
            </div>
          ))}
        </div>
        <div style={{padding:'10px 12px 16px',borderTop:`1px solid ${BD}`,flexShrink:0}}>
          <div style={{padding:'12px',borderRadius:12,background:`linear-gradient(135deg,rgba(0,255,200,0.07),rgba(0,102,255,0.05))`,border:`1px solid ${BD}`}}>
            <div style={{fontSize:11,color:G,fontWeight:700}}>✦ NUPRA PRO</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:3}}>Unlimited messages & advanced models</div>
            <button style={{marginTop:10,width:'100%',padding:'8px',borderRadius:9,background:`linear-gradient(135deg,${G},${G2})`,border:'none',color:'#000',fontFamily:'inherit',fontWeight:700,fontSize:12,cursor:'pointer'}}>Upgrade Free</button>
          </div>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'11px 18px',display:'flex',alignItems:'center',gap:12,borderBottom:`1px solid ${BD}`,background:'rgba(8,12,16,.96)',backdropFilter:'blur(12px)',flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:19}}>☰</button>
          <div style={{flex:1,display:'flex',justifyContent:'center'}}>
            <div style={{background:'rgba(0,255,200,0.06)',border:`1px solid ${BD}`,color:G,padding:'6px 16px',borderRadius:20,fontSize:13,fontWeight:700}}>Nupra Pro ✦</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setSearchOpen(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:16,padding:'4px 6px',borderRadius:6}}>🔍</button>
            <div style={{width:8,height:8,borderRadius:'50%',background:G,animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Online</span>
          </div>
        </div>

        {searchOpen&&(
          <div style={{padding:'8px 16px',borderBottom:`1px solid ${BD}`,display:'flex',gap:8,alignItems:'center',background:'rgba(8,12,16,.9)'}}>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search messages..." autoFocus
              style={{flex:1,background:'rgba(255,255,255,0.05)',border:`1px solid ${BD}`,borderRadius:9,padding:'7px 12px',color:'#e0f0ea',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
            <button onClick={()=>{setSearchOpen(false);setSearchQ('')}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:16}}>✕</button>
          </div>
        )}

        <div style={{flex:1,overflowY:'auto',padding:'24px 0'}}>
          {msgs.length===0&&!loading?(
            <div style={{maxWidth:640,margin:'0 auto',padding:'40px 22px',textAlign:'center'}}>
              <div style={{width:80,height:80,borderRadius:24,margin:'0 auto 24px',background:'linear-gradient(135deg,rgba(0,255,200,0.14),rgba(0,102,255,0.14))',border:'1.5px solid rgba(0,255,200,0.28)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:900,color:G}}>N</div>
              <h1 style={{margin:'0 0 10px',fontSize:28,fontWeight:800,background:`linear-gradient(135deg,#fff 30%,${G})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Meet Nupra AI</h1>
              <p style={{color:'rgba(255,255,255,0.4)',margin:'0 0 32px',fontSize:15,lineHeight:1.7}}>Your intelligent companion — powered by real-time AI</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                {SUGGESTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>send(s)}
                    style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(0,255,200,0.1)',borderRadius:11,padding:'13px 14px',color:'rgba(255,255,255,0.7)',fontFamily:'inherit',fontSize:13,cursor:'pointer',textAlign:'left',lineHeight:1.5}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,255,200,0.07)';e.currentTarget.style.color='#fff'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.color='rgba(255,255,255,0.7)'}}>
                    <span style={{color:G,marginRight:5,fontSize:10}}>→</span>{s}
                  </button>
                ))}
              </div>
            </div>
          ):(
            <div style={{maxWidth:740,margin:'0 auto',padding:'0 18px',display:'flex',flexDirection:'column'}}>
              {filtered.map((msg,idx)=>(
                <div key={msg.id||idx} className="mrow" style={{display:'flex',flexDirection:msg.role==='assistant'?'row':'row-reverse',alignItems:'flex-start',gap:11,marginBottom:10,animation:'fadeUp .28s ease forwards'}}>
                  <div style={{width:32,height:32,borderRadius:9,flexShrink:0,marginTop:2,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13,...(msg.role==='assistant'?AvatarAI:AvatarUser)}}>
                    {msg.role==='assistant'?'N':'U'}
                  </div>
                  <div style={{maxWidth:'82%',minWidth:0}}>
                    {msg.role==='assistant'&&<div style={{fontSize:10,color:G,fontWeight:700,marginBottom:5,letterSpacing:0.5}}>NUPRA</div>}
                    <div style={{padding:'13px 16px',fontSize:14.5,lineHeight:1.78,...(msg.role==='assistant'?{borderRadius:'4px 15px 15px 15px',background:'rgba(255,255,255,0.03)',border:`1px solid ${BD}`}:{borderRadius:'15px 15px 4px 15px',background:'linear-gradient(135deg,rgba(0,102,255,0.22),rgba(0,255,200,0.08))',border:'1px solid rgba(0,102,255,0.28)'})}}>
                      {msg.role==='assistant'?<MsgContent text={msg.content||''}/>:(msg.content||'')}
                    </div>
                    <div className="macts" style={{display:'flex',gap:2,marginTop:5,opacity:0,transition:'opacity .2s'}}>
                      <button onClick={()=>navigator.clipboard.writeText(msg.content)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:12,padding:'3px 8px',borderRadius:5,fontFamily:'inherit'}}>⎘ Copy</button>
                    </div>
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{display:'flex',alignItems:'flex-start',gap:11,marginBottom:10}}>
                  <div style={{width:32,height:32,borderRadius:9,flexShrink:0,...AvatarAI,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13}}>N</div>
                  <div>
                    <div style={{fontSize:10,color:G,fontWeight:700,marginBottom:5}}>NUPRA</div>
                    <div style={{padding:'13px 16px',borderRadius:'4px 15px 15px 15px',background:'rgba(255,255,255,0.03)',border:`1px solid ${BD}`}}><Dots/></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px 18px',background:'rgba(8,12,16,.97)',borderTop:`1px solid ${BD}`,flexShrink:0}}>
          <div style={{maxWidth:740,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'flex-end',gap:9,background:'rgba(255,255,255,0.03)',border:'1.5px solid rgba(0,255,200,0.15)',borderRadius:16,padding:'10px 12px'}}
              onFocusCapture={e=>{e.currentTarget.style.borderColor='rgba(0,255,200,0.4)';e.currentTarget.style.boxShadow='0 0 24px rgba(0,255,200,0.1)'}}
              onBlurCapture={e=>{e.currentTarget.style.borderColor='rgba(0,255,200,0.15)';e.currentTarget.style.boxShadow='none'}}>
              <textarea ref={taRef} value={input}
                onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,190)+'px'}}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
                placeholder="Message Nupra..." rows={1}
                style={{flex:1,background:'none',border:'none',outline:'none',color:'#e0f0ea',fontFamily:'inherit',fontSize:15,lineHeight:1.6,resize:'none',maxHeight:190,padding:'4px 8px'}}/>
              <button onClick={()=>send()} disabled={!input.trim()||loading}
                style={{width:36,height:36,borderRadius:9,border:'none',flexShrink:0,cursor:input.trim()&&!loading?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,transition:'all .2s',...(input.trim()&&!loading?{background:`linear-gradient(135deg,${G},${G2})`,color:'#000',boxShadow:'0 4px 15px rgba(0,255,200,0.38)'}:{background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.3)'})}}>↑</button>
            </div>
            <p style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.18)',margin:'7px 0 0'}}>Nupra AI · Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}
