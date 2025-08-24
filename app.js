import * as line from '@line/bot-sdk'
import express from 'express'
import axios from 'axios'
import * as fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { Duffel } from '@duffel/api'
import * as authenticator from 'authenticator'

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

app.post('/wedding/rsvp', (req, res) => {
  console.log('RSVP Submission:', req.body);
  
  // Extract RSVP data
  const { searchedName, foundGuest, party, attendance, dietary } = req.body;
  
  // Validate required fields
  if (!foundGuest || !party || !attendance) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required RSVP information' 
    });
  }
  
  // Process the RSVP data
  const rsvpSummary = {
    submittedAt: new Date().toISOString(),
    searchedName,
    foundGuest: foundGuest.name,
    partyCode: Object.keys(attendance)[0] ? Object.keys(attendance)[0].split('-')[0] : 'unknown',
    responses: []
  };
  
  // Process each party member's response
  Object.values(attendance).forEach(guest => {
    const response = {
      name: guest.name,
      attending: guest.status === 'accepted',
      dietary: dietary && dietary[guest.name] ? dietary[guest.name] : null
    };
    rsvpSummary.responses.push(response);
  });
  
  console.log('Processed RSVP:', rsvpSummary);
  
  // In a real implementation, you would save this to a database
  // For now, just log and return success
  
  res.json({ 
    status: 'success', 
    message: 'RSVP received successfully!',
    summary: rsvpSummary 
  });
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

app.get('/pasabuy/202508041330', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pasabuy Tracking - 202508041330</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          background-color: #f4eee5;
          color: #46544f;
          line-height: 1.6;
          min-height: 100vh;
          padding: 2rem;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          padding: 2rem;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5ddd4;
        }

        .tracking-id {
          font-size: 1.2rem;
          color: #8b7355;
          font-weight: normal;
          margin-bottom: 0.5rem;
        }

        .title {
          font-size: 2.5rem;
          color: #46544f;
          margin-bottom: 1rem;
          font-weight: bold;
        }

        .status-section {
          background: #f8f6f3;
          border-radius: 10px;
          padding: 2rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .status-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .status-text {
          font-size: 1.5rem;
          color: #46544f;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .status-detail {
          color: #8b7355;
          font-size: 1rem;
        }

        .payment-section {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .payment-section.show {
          opacity: 1;
          transform: translateY(0);
        }

        .payment-title {
          font-size: 1.8rem;
          color: #46544f;
          text-align: center;
          margin-bottom: 1rem;
          font-weight: bold;
        }

        .payment-amount {
          font-size: 2rem;
          color: #d4572a;
          text-align: center;
          margin-bottom: 2rem;
          font-weight: bold;
        }

        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .qr-item {
          text-align: center;
          background: white;
          padding: 1rem;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }

        .qr-item:hover {
          transform: translateY(-5px);
        }

        .qr-image {
          width: 100px;
          height: 100px;
          object-fit: contain;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .qr-label {
          font-size: 0.9rem;
          color: #8b7355;
          font-weight: bold;
          text-transform: uppercase;
        }

        @media (max-width: 768px) {
          body {
            padding: 1rem;
          }
          
          .container {
            padding: 1.5rem;
          }
          
          .title {
            font-size: 2rem;
          }
          
          .qr-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
      </style>
      <script type="module">
        import { Application, Controller } from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js"
        window.Stimulus = Application.start()

        Stimulus.register("pasabuy-tracker", class extends Controller {
          static targets = ["status", "statusIcon", "statusText", "statusDetail", "paymentSection"]
          
          connect() {
            this.checkStatus()
            // Check status every 30 seconds
            this.statusTimer = setInterval(() => this.checkStatus(), 30000)
          }

          disconnect() {
            if (this.statusTimer) {
              clearInterval(this.statusTimer)
            }
          }

          checkStatus() {
            const targetDate = new Date('2025-08-04T13:30:00+08:00')
            const now = new Date()
            
            if (now >= targetDate) {
              // Show "waiting to be processed" status
              this.statusIconTarget.textContent = '📦'
              this.statusTextTarget.textContent = '2 boxes are waiting to be processed'
              this.statusDetailTarget.textContent = 'Ready for payment and collection'
              this.statusTarget.style.background = '#e8f5e8'
              
              // Show payment section
              this.paymentSectionTarget.classList.add('show')
            } else {
              // Show "in transit" status
              this.statusIconTarget.textContent = '🚚'
              this.statusTextTarget.textContent = '2 boxes are in transit to Manila'
              this.statusDetailTarget.textContent = 'Estimated arrival: Aug 4, 2025 at 1:30 PM'
              this.statusTarget.style.background = '#f0f8ff'
              
              // Hide payment section
              this.paymentSectionTarget.classList.remove('show')
            }
          }
        })
      </script>
    </head>
    <body>
      <div class="container" data-controller="pasabuy-tracker">
        <div class="header">
          <div class="tracking-id">Tracking ID</div>
          <div class="title">202508041330</div>
        </div>

        <div class="status-section" data-pasabuy-tracker-target="status">
          <div class="status-icon" data-pasabuy-tracker-target="statusIcon">🚚</div>
          <div class="status-text" data-pasabuy-tracker-target="statusText">2 boxes are in transit to Manila</div>
          <div class="status-detail" data-pasabuy-tracker-target="statusDetail">Estimated arrival: Aug 4, 2025 at 1:30 PM</div>
        </div>

        <div class="payment-section" data-pasabuy-tracker-target="paymentSection">
          <div class="payment-title">Payment Required</div>
          <div class="payment-amount">₱ 1,800.00</div>
          
          <div class="qr-grid">
            <div class="qr-item">
              <img src="/gcash-qr-xavi-1800.png" alt="GCash QR" class="qr-image">
              <div class="qr-label">GCash</div>
            </div>
            <div class="qr-item">
              <img src="/maya-qr-xavi-1800.png" alt="Maya QR" class="qr-image">
              <div class="qr-label">Maya</div>
            </div>
            <div class="qr-item">
              <img src="/bpi-qr-xavi-1800.png" alt="BPI QR" class="qr-image">
              <div class="qr-label">BPI</div>
            </div>
            <div class="qr-item">
              <img src="/ub-qr-xavi-1800.png" alt="UnionBank QR" class="qr-image">
              <div class="qr-label">UnionBank</div>
            </div>
            <div class="qr-item">
              <img src="/komo-qr-xavi-1800.png" alt="Komo QR" class="qr-image">
              <div class="qr-label">Komo</div>
            </div>
          </div>
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
