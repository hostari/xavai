import * as line from '@line/bot-sdk'
import express from 'express'

// create LINE SDK config from env variables
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

app.get('/', (req, res) => {
  res.send('hello friend.');
});

app.get('/up', (req, res) => {
  res.sendStatus(200);
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
async function handleEvent(event) {
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

  // create an echoing text message
  const echo = { type: 'text', text: event.message.text };
  console.log(echo);

  // use reply API
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
