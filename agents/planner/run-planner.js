require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function telegram(msg) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: msg })
  });
}

async function main() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const batch = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;

  const { data: existing } = await supabase
    .from('marketing_posts').select('id').eq('batch_label', batch).limit(1);
  if (existing && existing.length > 0) {
    await telegram(`Planner: batch ${batch} already exists. Skipping.`);
    return;
  }

  // Load the Scout's fresh trends (memes, video formats, market intel)
  const { data: trends } = await supabase
    .from('trends')
    .select('kind,title,summary,relevance')
    .eq('status', 'new')
    .order('found_at', { ascending: false })
    .limit(15);

  // Load permanent lessons taught to the planner
  const { data: lessons } = await supabase
    .from('agent_lessons')
    .select('lesson')
    .eq('agent_name', 'planner')
    .eq('active', true);

  const trendBlock = trends && trends.length
    ? `\nCURRENT TRENDS from our Scout agent (use these!):\n` +
      trends.map(t => `- [${t.kind}] ${t.title}: ${t.summary || ''} (Mulak angle: ${t.relevance || 'n/a'})`).join('\n')
    : '';

  const lessonBlock = lessons && lessons.length
    ? `\nPERMANENT LESSONS you must always follow:\n` + lessons.map(l => `- ${l.lesson}`).join('\n')
    : '';

  const prompt = `You are the Marketing Planner for Mulak (mulak.app), an AI-powered property management app for landlords in Dubai. Features: unit and tenant management, rent cheque tracking, contract renewals, maintenance requests, net profit per unit, AI chat and voice assistant.
${lessonBlock}
${trendBlock}

Generate a 30-day content calendar for month ${batch}. Mix content types: product feature highlights, Dubai landlord tips (Ejari, RERA, rent cheques), engaging trivia or polls, app teasers — AND 4-6 MEME/TREND posts that use the trending meme formats listed above (adapt each format to a landlord/Mulak scenario; mention the format name in the visual_prompt so the visual agent knows the template).
Rules:
- Pick platforms per post from: instagram, facebook, tiktok, reddit, linkedin. Trivia/memes fit instagram, facebook, tiktok. Insights or tips fit linkedin, reddit.
- content_type is one of: image, video, story.
- visual_prompt is a clear one-sentence description of the visual to generate.
- Captions short and friendly. No fake statistics, no invented user stories.
Respond with ONLY a JSON array, no markdown, no backticks. Each item:
{"day": 1, "content_type": "image", "hook": "...", "caption": "...", "visual_prompt": "...", "platforms": ["instagram","facebook"]}`;

  const res = await anthropic.messages.create({
    model: 'claude-fable-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = res.content[0].text.replace(/```json|```/g, '').trim();
  const posts = JSON.parse(text);

  const rows = posts.map(p => ({
    batch_label: batch,
    scheduled_date: `${batch}-${String(p.day).padStart(2, '0')}`,
    content_type: p.content_type,
    hook: p.hook,
    caption: p.caption,
    visual_prompt: p.visual_prompt,
    platforms: p.platforms,
    utm_campaign: `${batch}-day${String(p.day).padStart(2, '0')}`,
    status: 'draft'
  }));

  const { error } = await supabase.from('marketing_posts').insert(rows);
  if (error) throw new Error(error.message);

  await telegram(`Planner: ${rows.length} draft posts ready for ${batch}, including trend/meme posts from the Scout's findings. Review in the CRM.`);
  console.log(`Done: ${rows.length} posts inserted for ${batch}.`);
}

main().catch(async e => {
  console.error(e);
  await telegram(`Planner FAILED: ${e.message}`);
  process.exit(1);
});
