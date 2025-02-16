import * as line from '@line/bot-sdk'
import express from 'express'
import axios from 'axios'
import * as fs from 'fs'
import crypto from 'crypto'

// Read the context file
const chotikaiContext = fs.readFileSync(`/app/data/${process.env.CONTEXT_FILE_NAME}`, 'utf8');
const currentUTC = new Date().toISOString();

async function callLMStudio(userMessage) {
  const response = await axios.post(`http://${process.env.LM_STUDIO_HOST}:1234/v1/chat/completions`, {
    model: "deepseek-r1-distill-qen-7b",
    messages: [
      {
        role: "system",
        content: `I have the following context, which consists of summaries of conversations between Charlotte and Xavi. <context>${chotikaiContext}</context>.`
      },
      {
        role: "user",
        content: `Using the context information that you have, I want you to think step by step to answer the query in a crisp manner, in case you don't know the answer say 'I don't know!'. Query: ${userMessage}. Answer: `
      }
    ],
    temperature: 0.7,
    max_tokens: -1,
    stream: false
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content;
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

app.get('/', (_req, res) => {
  res.send('hello friend.');
});

app.get('/up', (_req, res) => {
  res.status(200).end();
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
  const botInfo = await client.getBotInfo();
  const botName = `@${botInfo.displayName}`;

  // Only reply if message mentions the bot by display name
  if (!event.message.text.includes(botName)) {
    return Promise.resolve(null);
  }

  // Create a response text message
  let messages = []
  if (process.env.BOT_ECHO === 'true' || process.env.BOT_ECHO === '1') {
    const echo = buildResponseMessage(event.message.text);
    messages.push(echo);
  } else if (event.message.text.includes('/version')) {
    const hash = crypto.createHash('sha256').update(chotikaiContext).digest('hex').slice(0, 7);
    messages.push(buildResponseMessage(`Loaded chotikai.txt version ${hash} at ${currentUTC}`));
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
