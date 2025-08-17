import * as line from '@line/bot-sdk'
import express from 'express'
import axios from 'axios'
import * as fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { Duffel } from '@duffel/api'
import * as authenticator from 'authenticator'
import pkg from 'pg'
const { Pool } = pkg

const duffel = new Duffel({
  token: process.env.DUFFEL_TOKEN,
})

async function callLMStudio(userMessage) {
  try {
    let messages = [{role: "user", content: userMessage}];
    const response = await axios.post(`http://${process.env.LM_STUDIO_HOST}:1234/v1/chat/completions`, {
      model: "deepseek-r1-distill-qwen-7b",
      messages: messages,
      temperature: 0.7,
      max_tokens: -1,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error in callLMStudio:', error);
    return "Oops, an error occurred. Try prompting me again.";
  }
}

// create LINE SDK config from env variables
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();
app.use(express.static('public'));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('hello friend.');
});

app.get('/up', (_req, res) => {
  res.status(200).end();
});

app.get('/autoq', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'autoq.html'));
});

app.post('/katsu-midori-thailand-centralworld/queue-request', (req, res) => {
  console.log('Queue Request:', req.body);
  res.json({ status: 'success', data: req.body });
});

app.get('/masungi-georeserve', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'masungi-georeserve.html'));
});

// Wedding website routes
app.get('/wedding', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding.html'));
});

app.get('/wedding/our-story', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-our-story.html'));
});

app.get('/wedding/photos', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-photos.html'));
});

app.get('/wedding/qna', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-qna.html'));
});

app.get('/wedding/travel', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-travel.html'));
});

app.get('/wedding/things-to-do', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-things-to-do.html'));
});

app.get('/wedding/registry', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-registry.html'));
});

app.get('/wedding/rsvp', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-rsvp.html'));
});

app.get('/wedding/rsvp-success', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-rsvp-success.html'));
});

app.post('/wedding/rsvp', async (req, res) => {
  try {
    console.log('RSVP Submission:', req.body);
    
    const { 
      searchedName, 
      foundGuest, 
      party, 
      attendance, 
      dietary,
      guestInfo = {} // Additional guest information
    } = req.body;
    
    // Validate required fields
    if (!foundGuest || !party || !attendance) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required RSVP information' 
      });
    }
    
    // Insert RSVP responses into database
    const client = await pool.connect();
    const insertedResponses = [];
    
    try {
      await client.query('BEGIN');
      
      // Process each party member's response
      for (const [guestId, guest] of Object.entries(attendance)) {
        const [firstName, ...lastNameParts] = guest.name.split(' ');
        const lastName = lastNameParts.join(' ');
        
        const insertQuery = `
          INSERT INTO rsvp_responses (
            invited_by, first_name, last_name, nickname, country, 
            phone, email, travel_party, travel_origin, party_code, 
            total_guests, response, dietary_restrictions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `;
        
        const values = [
          guestInfo.invitedBy || null,
          firstName,
          lastName || '',
          guestInfo.nickname || null,
          guestInfo.country || null,
          guestInfo.phone || null,
          guestInfo.email || null,
          guestInfo.travelParty || null,
          guestInfo.travelOrigin || null,
          foundGuest.id?.split('guest')[0] + 'PARTY' || 'UNKNOWN',
          party.length,
          guest.status,
          dietary && dietary[guest.name] ? dietary[guest.name] : null
        ];
        
        const result = await client.query(insertQuery, values);
        insertedResponses.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      // Create response summary
      const rsvpSummary = {
        submittedAt: new Date().toISOString(),
        searchedName,
        foundGuest: foundGuest.name,
        partyCode: foundGuest.id?.split('guest')[0] + 'PARTY' || 'UNKNOWN',
        responses: Object.values(attendance).map(guest => ({
          name: guest.name,
          attending: guest.status === 'accepted',
          dietary: dietary && dietary[guest.name] ? dietary[guest.name] : null
        }))
      };
      
      console.log('Processed RSVP:', rsvpSummary);
      
      res.json({ 
        status: 'success', 
        message: 'RSVP received successfully!',
        summary: rsvpSummary,
        redirectUrl: '/wedding/rsvp-success'
      });
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error processing RSVP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process RSVP. Please try again.'
    });
  }
});

// Flight route pages - North America (to BKK only)
app.get('/wedding/flights/jfk-bkk', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'jfk-bkk.html'));
});

app.get('/wedding/flights/lga-bkk', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'lga-bkk.html'));
});

app.get('/wedding/flights/sfo-bkk', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'sfo-bkk.html'));
});


app.get('/wedding/flights/lax-bkk', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'lax-bkk.html'));
});

app.get('/wedding/flights/sea-bkk', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'sea-bkk.html'));
});

app.get('/wedding/flights/yyz-bkk', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'yyz-bkk.html'));
});

// Flight route pages - Asia (with choice of BKK or DMK)
app.get('/wedding/flights/mnl-choose', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'mnl-choose.html'));
});

app.get('/wedding/flights/hkg-choose', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'hkg-choose.html'));
});

app.get('/wedding/flights/icn-choose', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'icn-choose.html'));
});

app.get('/wedding/flights/pvg-choose', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'pvg-choose.html'));
});


app.get('/2fa/mscs-phic/value', (req, res) => {
  res.send(authenticator.generateToken(process.env.MSCS_PHIC_2FA_KEY))
});

app.get('/2fa/mscs-phic', (_req, res) => {
  const initialToken = authenticator.generateToken(process.env.MSCS_PHIC_2FA_KEY);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MSCS PHIC 2FA Token</title>
      <style>
        .notification {
          color: green;
          margin-left: 10px;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .notification.show {
          opacity: 1;
        }
        .container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .clock {
          font-family: monospace;
          font-size: 24px;
          margin-bottom: 20px;
        }
      </style>
      <script type="module">
        import { Application, Controller } from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js"
        window.Stimulus = Application.start()

        Stimulus.register("token-refresher", class extends Controller {
          static targets = [ "display", "clock", "notification" ]
          
          connect() {
            this.updateClock()
            this.clockTimer = setInterval(() => this.updateClock(), 1000)
          }

          disconnect() {
            if (this.clockTimer) {
              clearInterval(this.clockTimer)
            }
          }

          async updateClock() {
            const now = new Date()
            const seconds = now.getSeconds()
            this.clockTarget.textContent = now.toLocaleTimeString()

            if (seconds === 0 || seconds === 30) {
              await this.refreshToken()
            }
          }

          async refreshToken() {
            const response = await fetch('/2fa/mscs-phic/value')
            const token = await response.text()
            this.displayTarget.textContent = token
          }

          async copy() {
            await navigator.clipboard.writeText(this.displayTarget.textContent)
            this.notificationTarget.classList.add('show')
            setTimeout(() => {
              this.notificationTarget.classList.remove('show')
            }, 2000)
          }
        })
      </script>
    </head>
    <body>
      <div data-controller="token-refresher">
        <h1>MSCS PHIC 2FA Token</h1>
        <div class="clock" data-token-refresher-target="clock"></div>
        <div class="container">
          <div data-token-refresher-target="display" style="font-size: 48px; font-family: monospace;">
            ${initialToken}
          </div>
          <button data-action="token-refresher#copy">
            Copy
          </button>
          <span data-token-refresher-target="notification" class="notification">Copied!</span>
        </div>
      </div>
    </body>
    </html>
  `);
});

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/line/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
function removeThinkTags(text) {
  return text.replace(/<think>.*?<\/think>/gs, '').trim();
}

function buildResponseMessage(text) {
  return { type: 'text', text: text };
}

async function handleEvent(event) {
  console.log('Event source:', event.source);
  
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // Get bot info to check its display name
  const botName = `@${process.env.BOT_NAME}`;
  const messageText = event.message.text.toLowerCase();

  if (!messageText.includes(botName.toLowerCase())) {
    return Promise.resolve(null);
  }

  // Create a response text message
  let messages = [];
  if (process.env.BOT_ECHO === 'true' || process.env.BOT_ECHO === '1') {
    const echo = buildResponseMessage(event.message.text);
    messages.push(echo);
  } else {
    const userMessage = event.message.text.replace(botName, '').trim();
    if (process.env.LOG_LM_STUDIO === 'true' || process.env.LOG_LM_STUDIO === '1') {
      console.log('Calling LM Studio...');
    }
    const response = await callLMStudio(userMessage);
    if (process.env.LOG_LM_STUDIO === 'true' || process.env.LOG_LM_STUDIO === '1') {
      console.log(`LM Studio Response: ${response}`);
    }
    let cleanedResponse = response;
    if (process.env.REMOVE_THINK_TAGS === 'true' || process.env.REMOVE_THINK_TAGS === '1') {
      cleanedResponse = removeThinkTags(response);
    }
    messages.push(buildResponseMessage(cleanedResponse));
  }

  // use reply API
  const replyToken = event.replyToken
  return client.replyMessage({replyToken, messages});
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
