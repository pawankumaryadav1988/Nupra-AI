# Nupra AI — Deployment Guide 

## Step 1: Supabase Setup
1. supabase.com pe jao → New Project banao
2. Project create ho jaye toh **SQL Editor** mein jao
3. `supabase-schema.sql` ka content paste karke Run karo
4. Settings > API se copy karo:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 2: Anthropic API Key
1. console.anthropic.com pe jao
2. API Keys > Create Key
3. Copy karo → `ANTHROPIC_API_KEY`

## Step 3: Local Setup
```bash
# 1. Dependencies install karo
npm install

# 2. .env.local file mein apni keys daalo
# (already bani hui hai, sirf values replace karo)

# 3. Local run karo
npm run dev
# → http://localhost:3000 pe khulega
```

## Step 4: GitHub pe upload karo
```bash
git init
git add .
git commit -m "Nupra AI initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nupra-ai.git
git push -u origin main
```

## Step 5: Vercel Deploy
1. vercel.com pe jao → New Project
2. GitHub repo select karo
3. Environment Variables add karo:
   - `ANTHROPIC_API_KEY` = your key
   - `NEXT_PUBLIC_SUPABASE_URL` = your url
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your key
4. Deploy karo → Live URL milega!

## Features
- Real-time streaming AI responses
- Supabase database (conversations + messages saved)
- Sidebar with chat history
- New chat, rename, delete
- Voice input (Chrome)
- File/image upload
- Search messages
- Export chat
- Copy, Retry, Edit messages
- Nupra Pro color theme (cyan + blue)
