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
          <button onclick="window.Stimulus.getControllerForElementAndIdentifier(document.querySelector('[data-controller=token-refresher]'), 'token-refresher').copy()">
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
