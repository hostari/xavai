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
  res.sendFile(path.join(process.cwd(), 'views', '2fa-token.html'));
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
