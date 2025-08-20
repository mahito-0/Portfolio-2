export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat') {
      return new Response('Not found', { status: 404, headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    try {
      const { messages } = await request.json();
      if (!Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages,
          temperature: 0.2,
          max_tokens: 512,
          stream: false
        })
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        console.error('Groq error:', data);
        return new Response(JSON.stringify({ error: data }), { status: upstream.status, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      const reply = data?.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({ reply }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }
};