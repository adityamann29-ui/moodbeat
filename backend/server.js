const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Groq AI Analysis ────────────────────────────────────────────────────────
async function analyzeWithGroq(text) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an emotion analysis AI.
When given a text, analyze the emotions and return ONLY a valid JSON object like this:
{
  "mood": "happy",
  "tones": [
    { "tone_name": "Joy", "score": 0.85 },
    { "tone_name": "Excitement", "score": 0.60 }
  ]
}
Mood must be exactly one of: happy, sad, angry, anxious, motivated, chill, focused, heartbroken, tired.
Tones should be 2-4 emotions detected with scores between 0 and 1.
Return ONLY the JSON. No explanation. No markdown. No extra text.`,
        },
        {
          role: 'user',
          content: `Analyze this text: "${text}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const raw     = response.data.choices[0].message.content.trim();
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Chat with Groq ───────────────────────────────────────────────────────────
async function chatWithGroq(messages, mood, username) {
  const systemPrompt = `You are a warm, caring friend who is always there to listen.
You are talking to ${username}, who is currently feeling ${mood}.
Your job is to:
- Listen carefully and acknowledge their feelings
- Ask gentle follow up questions to understand them better
- Offer kind and practical suggestions only when they ask for solutions
- Never be dismissive or preachy
- Keep your replies conversational and short — 2 to 4 sentences max
- Talk like a real friend, not a therapist or a robot
- Use their name ${username} occasionally to make it feel personal
- Remember everything they have told you in this conversation
- If they ask for advice or a solution, give it honestly and warmly
Do not use bullet points. Just talk naturally.`;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 300,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

// ─── Save to Cloudant ─────────────────────────────────────────────────────────
async function saveToCloudant(data) {
  const url = `${process.env.CLOUDANT_URL}/moodbeats`;
  await axios.post(url, data, {
    auth: {
      username: process.env.CLOUDANT_USERNAME,
      password: process.env.CLOUDANT_PASSWORD,
    },
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Get from Cloudant filtered by username ───────────────────────────────────
async function getFromCloudant(username) {
  const url = `${process.env.CLOUDANT_URL}/moodbeats/_all_docs`;
  const response = await axios.get(url, {
    auth: {
      username: process.env.CLOUDANT_USERNAME,
      password: process.env.CLOUDANT_PASSWORD,
    },
    params: {
      include_docs: true,
      limit: 100,
    },
  });

  return response.data.rows
    .map(row => row.doc)
    .filter(doc =>
      doc &&
      !doc._id.startsWith('_design') &&
      doc.text &&
      doc.username === username
    )
    .slice(0, 20); // return latest 20 for this user
}

// ─── Song Database ────────────────────────────────────────────────────────────
const songMap = {
  english: {
    happy: [
      { title: 'Happy', artist: 'Pharrell Williams', url: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs' },
      { title: "Can't Stop the Feeling", artist: 'Justin Timberlake', url: 'https://www.youtube.com/watch?v=ru0K8uYEZWw' },
      { title: 'Uptown Funk', artist: 'Bruno Mars', url: 'https://www.youtube.com/watch?v=OPf0YbXqDm0' },
      { title: 'Shake It Off', artist: 'Taylor Swift', url: 'https://www.youtube.com/watch?v=nfWlot6h_JM' },
      { title: 'Dance Monkey', artist: 'Tones and I', url: 'https://www.youtube.com/watch?v=q0hyYWKXF0Q' },
    ],
    sad: [
      { title: 'Someone Like You', artist: 'Adele', url: 'https://www.youtube.com/watch?v=hLQl3WQQoQ0' },
      { title: 'Fix You', artist: 'Coldplay', url: 'https://www.youtube.com/watch?v=k4V3Mo61fJM' },
      { title: 'Let Her Go', artist: 'Passenger', url: 'https://www.youtube.com/watch?v=RBumgq5yVrA' },
      { title: 'Stay With Me', artist: 'Sam Smith', url: 'https://www.youtube.com/watch?v=pB-5XG-DbAA' },
      { title: 'The Night We Met', artist: 'Lord Huron', url: 'https://www.youtube.com/watch?v=KtlgYxa6BMU' },
    ],
    angry: [
      { title: 'In the End', artist: 'Linkin Park', url: 'https://www.youtube.com/watch?v=eVTXPUF4Oz4' },
      { title: 'Numb', artist: 'Linkin Park', url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU' },
      { title: 'Lose Yourself', artist: 'Eminem', url: 'https://www.youtube.com/watch?v=_Yhyp-_hX2s' },
      { title: 'Believer', artist: 'Imagine Dragons', url: 'https://www.youtube.com/watch?v=7wtfhZwyrcc' },
      { title: 'Stronger', artist: 'Kanye West', url: 'https://www.youtube.com/watch?v=PsO6ZnUZI0g' },
    ],
    anxious: [
      { title: 'Let It Be', artist: 'The Beatles', url: 'https://www.youtube.com/watch?v=QDYfEBY9NM4' },
      { title: 'Holocene', artist: 'Bon Iver', url: 'https://www.youtube.com/watch?v=TWcyIpul8OE' },
      { title: 'The Sound of Silence', artist: 'Simon & Garfunkel', url: 'https://www.youtube.com/watch?v=4zLfCnGVeL4' },
      { title: 'Breathe', artist: 'Pink Floyd', url: 'https://www.youtube.com/watch?v=nPyBBQgbTDM' },
      { title: 'Weightless', artist: 'Marconi Union', url: 'https://www.youtube.com/watch?v=UfcAVejslrU' },
    ],
    focused: [
      { title: 'Time', artist: 'Hans Zimmer', url: 'https://www.youtube.com/watch?v=RxabLA7UQ9k' },
      { title: 'Experience', artist: 'Ludovico Einaudi', url: 'https://www.youtube.com/watch?v=hN_q-_nGv4U' },
      { title: 'Interstellar Main Theme', artist: 'Hans Zimmer', url: 'https://www.youtube.com/watch?v=UDVtMYqUAyw' },
      { title: 'Natural', artist: 'Imagine Dragons', url: 'https://www.youtube.com/watch?v=syZivkfcHyA' },
      { title: 'Radioactive', artist: 'Imagine Dragons', url: 'https://www.youtube.com/watch?v=ktvTqknDobU' },
    ],
    motivated: [
      { title: 'Eye of the Tiger', artist: 'Survivor', url: 'https://www.youtube.com/watch?v=btPJPFnesV4' },
      { title: 'Lose Yourself', artist: 'Eminem', url: 'https://www.youtube.com/watch?v=_Yhyp-_hX2s' },
      { title: 'Unstoppable', artist: 'Sia', url: 'https://www.youtube.com/watch?v=cxjvTXo9WWM' },
      { title: 'Thunder', artist: 'Imagine Dragons', url: 'https://www.youtube.com/watch?v=fKopy74weus' },
      { title: 'Believer', artist: 'Imagine Dragons', url: 'https://www.youtube.com/watch?v=7wtfhZwyrcc' },
    ],
    chill: [
      { title: 'Banana Pancakes', artist: 'Jack Johnson', url: 'https://www.youtube.com/watch?v=OkyrIRyrRdY' },
      { title: 'Sunday Morning', artist: 'Maroon 5', url: 'https://www.youtube.com/watch?v=S2Cti12XBw4' },
      { title: 'Electric Feel', artist: 'MGMT', url: 'https://www.youtube.com/watch?v=MmZexg8sxyk' },
      { title: 'Redbone', artist: 'Childish Gambino', url: 'https://www.youtube.com/watch?v=nRJnZsB52Es' },
      { title: 'Peaches', artist: 'Justin Bieber', url: 'https://www.youtube.com/watch?v=tQ0yjYUFKAE' },
    ],
    heartbroken: [
      { title: 'Drivers License', artist: 'Olivia Rodrigo', url: 'https://www.youtube.com/watch?v=ZmDBbnmKpqQ' },
      { title: "When the Party's Over", artist: 'Billie Eilish', url: 'https://www.youtube.com/watch?v=pbMwTqkKSps' },
      { title: 'The Scientist', artist: 'Coldplay', url: 'https://www.youtube.com/watch?v=RB-RcX5DS5A' },
      { title: 'All I Want', artist: 'Kodaline', url: 'https://www.youtube.com/watch?v=tQ4s6tMKjAI' },
      { title: 'Someone You Loved', artist: 'Lewis Capaldi', url: 'https://www.youtube.com/watch?v=zABniqnH1kQ' },
    ],
    tired: [
      { title: 'Banana Pancakes', artist: 'Jack Johnson', url: 'https://www.youtube.com/watch?v=OkyrIRyrRdY' },
      { title: 'Sunday Morning', artist: 'Maroon 5', url: 'https://www.youtube.com/watch?v=S2Cti12XBw4' },
      { title: 'Let It Be', artist: 'The Beatles', url: 'https://www.youtube.com/watch?v=QDYfEBY9NM4' },
      { title: 'The Sound of Silence', artist: 'Simon & Garfunkel', url: 'https://www.youtube.com/watch?v=4zLfCnGVeL4' },
      { title: 'Breathe', artist: 'Pink Floyd', url: 'https://www.youtube.com/watch?v=nPyBBQgbTDM' },
    ],
  },
  hindi: {
    happy: [
      { title: 'Badtameez Dil', artist: 'Pritam', url: 'https://www.youtube.com/watch?v=II2EO3Nw4m0' },
      { title: 'London Thumakda', artist: 'Labh Janjua', url: 'https://www.youtube.com/watch?v=udra3Mfw2oo' },
      { title: 'Balam Pichkari', artist: 'Shalmali Kholgade', url: 'https://www.youtube.com/watch?v=0WtRNGubWGA' },
      { title: 'Nagada Sang Dhol', artist: 'Shreya Ghoshal', url: 'https://www.youtube.com/watch?v=vK5E_aeBGYA' },
      { title: 'Ghungroo', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=qFkNATtc3mc' },
    ],
    sad: [
      { title: 'Channa Mereya', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=284Ov7ysmfA' },
      { title: 'Tum Hi Ho', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=Umqb9KENgmk' },
      { title: 'Agar Tum Saath Ho', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=sK7riqg2mr4' },
      { title: 'Kabira', artist: 'Rekha Bhardwaj', url: 'https://www.youtube.com/watch?v=5_bGNaHNJU4' },
      { title: 'Arijit Singh Mashup', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=VzOEGxBQ9R0' },
    ],
    angry: [
      { title: 'Mere Gully Mein', artist: 'Divine, Naezy', url: 'https://www.youtube.com/watch?v=PBDZ8V1XTiA' },
      { title: 'Lafda', artist: 'Raftaar', url: 'https://www.youtube.com/watch?v=0QIYM0HlA8o' },
      { title: 'Gully Boy', artist: 'Divine', url: 'https://www.youtube.com/watch?v=M9ch_1Y9aWk' },
      { title: 'Asli Hip Hop', artist: 'Ranveer Singh', url: 'https://www.youtube.com/watch?v=rMnCMFAJc9s' },
      { title: 'Doori', artist: 'Nucleya', url: 'https://www.youtube.com/watch?v=3uMNSHqnBOQ' },
    ],
    anxious: [
      { title: 'Iktara', artist: 'Kavita Seth', url: 'https://www.youtube.com/watch?v=vBfm7hEylFo' },
      { title: 'Mann Mera', artist: 'Gajendra Verma', url: 'https://www.youtube.com/watch?v=z0PkBO9FHxc' },
      { title: 'Khaabon Ke Parinday', artist: 'Mohit Chauhan', url: 'https://www.youtube.com/watch?v=0-DGjzFjGNQ' },
      { title: 'O Re Piya', artist: 'Rahat Fateh Ali Khan', url: 'https://www.youtube.com/watch?v=HVzmSfzm4r0' },
      { title: 'Kun Faya Kun', artist: 'A.R. Rahman', url: 'https://www.youtube.com/watch?v=T94PHkuydcw' },
    ],
    focused: [
      { title: 'Kun Faya Kun', artist: 'A.R. Rahman', url: 'https://www.youtube.com/watch?v=T94PHkuydcw' },
      { title: 'Tere Bina', artist: 'A.R. Rahman', url: 'https://www.youtube.com/watch?v=p63xfZMWxeM' },
      { title: 'Raabta', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=jHNNMj5bNQw' },
      { title: 'Dil Dhadakne Do', artist: 'Shankar-Ehsaan-Loy', url: 'https://www.youtube.com/watch?v=tlHQHJe5fFY' },
      { title: 'Ae Dil Hai Mushkil', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=6FURuLYrR_Q' },
    ],
    motivated: [
      { title: 'Kar Har Maidaan Fateh', artist: 'Sukhwinder Singh', url: 'https://www.youtube.com/watch?v=4MiNzEoBHs0' },
      { title: 'Zinda', artist: 'Siddharth Mahadevan', url: 'https://www.youtube.com/watch?v=bsQNRsHcY4I' },
      { title: 'Jai Ho', artist: 'A.R. Rahman', url: 'https://www.youtube.com/watch?v=xwwwLRPSgZ8' },
      { title: 'Sultan', artist: 'Vishal Dadlani', url: 'https://www.youtube.com/watch?v=SUyDRMkKTSU' },
      { title: 'Dangal', artist: 'Pritam', url: 'https://www.youtube.com/watch?v=HS2gHm9PJQY' },
    ],
    chill: [
      { title: 'Tu Jaane Na', artist: 'Atif Aslam', url: 'https://www.youtube.com/watch?v=53l2DkivxJs' },
      { title: 'Luka Chuppi', artist: 'A.R. Rahman', url: 'https://www.youtube.com/watch?v=rtrL2eMZQFE' },
      { title: 'Dil Toh Baccha Hai Ji', artist: 'Rahat Fateh Ali Khan', url: 'https://www.youtube.com/watch?v=dhD4CS-kK88' },
      { title: 'Aaj Jaane Ki Zidd Na Karo', artist: 'Farida Khanum', url: 'https://www.youtube.com/watch?v=CfUDuYAasjE' },
      { title: 'Tera Yaar Hoon Main', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=EatzcaVJRMs' },
    ],
    heartbroken: [
      { title: 'Bekhayali', artist: 'Sachet Tandon', url: 'https://www.youtube.com/watch?v=Q8oLEtgmwME' },
      { title: 'Tera Ghata', artist: 'Gajendra Verma', url: 'https://www.youtube.com/watch?v=7bVHhMcGkxg' },
      { title: 'Channa Mereya', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=284Ov7ysmfA' },
      { title: 'Judaai', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=L4xX6xw87qk' },
      { title: 'Hamari Adhuri Kahani', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=MtPyPiCdMxk' },
    ],
    tired: [
      { title: 'Tu Jaane Na', artist: 'Atif Aslam', url: 'https://www.youtube.com/watch?v=53l2DkivxJs' },
      { title: 'Aaj Jaane Ki Zidd Na Karo', artist: 'Farida Khanum', url: 'https://www.youtube.com/watch?v=CfUDuYAasjE' },
      { title: 'Mann Mera', artist: 'Gajendra Verma', url: 'https://www.youtube.com/watch?v=z0PkBO9FHxc' },
      { title: 'Dil Toh Baccha Hai Ji', artist: 'Rahat Fateh Ali Khan', url: 'https://www.youtube.com/watch?v=dhD4CS-kK88' },
      { title: 'Tera Yaar Hoon Main', artist: 'Arijit Singh', url: 'https://www.youtube.com/watch?v=EatzcaVJRMs' },
    ],
  },
};

// ─── Motivational messages ────────────────────────────────────────────────────
const moodMessages = {
  happy:       "Good energy today. Ride it.",
  sad:         "It's okay to not be okay. Here's something for the moment.",
  angry:       "Channel that energy. Let the music take it.",
  anxious:     "Breathe. One song at a time.",
  motivated:   "You're locked in. Don't break the momentum.",
  focused:     "Zone mode activated. Keep going.",
  heartbroken: "Healing takes time. Music helps.",
  tired:       "Rest is productive too. Easy songs for now.",
  chill:       "Low effort, high vibe. Just float.",
};

// ─── POST /api/analyze ────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, quickMood, username } = req.body;
    let mood  = quickMood || 'chill';
    let tones = [];

    if (text && text.trim().length > 0) {
      const result = await analyzeWithGroq(text);
      mood  = result.mood  || 'chill';
      tones = result.tones || [];
    }

    const englishSongs = songMap.english[mood] || songMap.english.chill;
    const hindiSongs   = songMap.hindi[mood]   || songMap.hindi.chill;
    const message      = moodMessages[mood]    || "Here's something for right now.";

    // Only save journal entries (not quick mood) to Cloudant
    if (text && text.trim().length > 0) {
      saveToCloudant({
        text,
        mood,
        tones,
        username: username || 'Anonymous',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    res.json({ mood, tones, message, englishSongs, hindiSongs });
  } catch (err) {
    console.error('Error:', err.response ? JSON.stringify(err.response.data) : err.message);
    res.status(500).json({ error: 'Something went wrong. Check your API keys in .env' });
  }
});

// ─── POST /api/chat ───────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, mood, username } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    const reply = await chatWithGroq(messages, mood || 'neutral', username || 'Friend');
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.response ? JSON.stringify(err.response.data) : err.message);
    res.status(500).json({ error: 'Chat failed. Try again.' });
  }
});

// ─── GET /api/history ─────────────────────────────────────────────────────────
app.get('/api/history', async (req, res) => {
  try {
    const username = req.query.username || 'Anonymous';
    const entries  = await getFromCloudant(username);
    res.json({ entries });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

// ─── GET /api/ping-cloudant ───────────────────────────────────────────────────
app.get('/api/ping-cloudant', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.CLOUDANT_URL}/moodbeats`, {
      auth: {
        username: process.env.CLOUDANT_USERNAME,
        password: process.env.CLOUDANT_PASSWORD,
      },
    });
    res.json({ ok: true, db: response.data });
  } catch (err) {
    res.json({ ok: false, error: err.response ? err.response.data : err.message });
  }
});

app.get('/', (req, res) => res.send('MoodBeats backend running ✅'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));