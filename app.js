import * as line from '@line/bot-sdk'
import express from 'express'
import axios from 'axios'
import * as fs from 'fs'
import crypto from 'crypto'

// Read the context file
const chotikaiContext = fs.readFileSync(`/app/data/${process.env.CONTEXT_FILE_NAME}`, 'utf8');
const currentUTC = new Date().toISOString();
let useContext = true;
const noContextMessages = [
"Alright, no context info will be used anymore. You can go ahead and ask me anything.",
"Okay, I'm not going to use any context info now. Feel free to ask me questions.",
"Got it, from now on, I won't use any context information. You may continue asking me your questions.",
"Understood, no context information will be used moving forward. Ask away whenever you want.",
"Gotcha, I won't use any context info anymore. Feel free to keep asking me whatever you like.",
"Not going to use any context info from now on. You can keep asking me anything.",
"No context info from me here onward. Alright, go ahead and ask me your questions.",
"Understood, no context information will be used now onwards. Feel free to continue asking me.",
"Alright, no context info from this point. I'm here to answer any questions you have.",
"Got it, from now on, I won't use any context information anymore. You can ask me anything.",
"OK, I won’t provide any context information moving forward. You’re welcome to pose any question you like.",
"OK, I’m not going to share any context info anymore. Any query is fine.",
"OK, I will refrain from using any context info. Any questions are welcome.",
"OK, I’m avoiding providing context information now and in the future. Any question is okay.",
"OK, I won’t use any context info moving on. Any question is acceptable.",
"OK, I’ve agreed not to use any context info anymore. Any query is fine.",
"OK, I will stop using any context info from now on. You can ask me any question.",
"OK, I’m no longer going to provide any context information. Any questions are welcome.",
"OK, I’ve decided not to use any context info anymore. Any query is acceptable.",
"OK, I won’t share any context info moving forward. You can ask me any question you want.",
"OK, I’m avoiding using any context information now and in the future. Any questions are fine.",
"OK, I’ve agreed not to use any context info anymore. Any query is acceptable.",
"OK, I won’t provide any context information moving on. Any question is welcome.",
"OK, I’m no longer going to share any context info. You can ask me any question you want.",
"OK, I’ve decided not to use any context info anymore. Any query is fine.",
"OK, I’ll stop using any context information from now on. Any questions are acceptable.",
"OK, I won’t share any context info moving forward. You can ask me any question you want.",
"OK, I’m avoiding providing any context information anymore. Any query is fine.",
"OK, I’ve agreed not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t provide any context info from now on. You can ask me any question you want.",
"OK, I’m refraining from using any context information. Any query is fine.",
"OK, I’ve no longer agreed to use any context info. Any questions are acceptable.",
"OK, I won’t use any context info anymore. You can ask me any question you like.",
"OK, I’m avoiding providing any context information now and in the future. Any query is fine.",
"OK, I’ve decided to stop using any context info from now on. Any questions are acceptable.",
"OK, I won’t share any context info moving forward. You can ask me any question you want.",
"OK, I’m no longer going to provide any context information. Any queries are fine.",
"OK, I’ve agreed not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t use any context info from now on. You can ask me any question you like.",
"OK, I’m avoiding using any context information moving forward. Any query is fine.",
"OK, I’ve decided to stop providing any context info. You can ask me any question you want.",
"OK, I won’t provide any context info anymore. Any questions are acceptable.",
"OK, I’m no longer going to use any context information. Any queries are fine.",
"OK, I’ve agreed not to share any context info from now on. Any question is acceptable.",
"OK, I won’t stop using any context info anymore. You can ask me any query you like.",
"OK, I’m avoiding providing any context information moving forward. Any queries are fine.",
"OK, I’ve decided not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t share any context information from now on. You can ask me any question you want.",
"OK, I’m no longer going to provide any context info. Any query is fine.",
"OK, I’ve agreed not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information from now on. You can ask me any question you like.",
"OK, I’m avoiding providing any context info moving forward. Any queries are fine.",
"OK, I’ve decided to stop sharing any context info now and in the future. Any questions are acceptable.",
"OK, I won’t provide any context information anymore. You can ask me any query you like.",
"OK, I’m no longer going to use any context info from now on. Any queries are fine.",
"OK, I’ve agreed not to share any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information moving forward. Any query is fine.",
"OK, I’m avoiding providing any context info from now on. Any questions are acceptable.",
"OK, I’ve decided not to use any context info anymore. Any queries are fine.",
"OK, I won’t share any context information moving forward. You can ask me any question you want.",
"OK, I’ve agreed to stop using any context info now and in the future. Any query is acceptable.",
"OK, I’m no longer going to provide any context information. You can ask me any question you like.",
"OK, I’ll stop providing any context info from now on. Any queries are fine.",
"OK, I’ve decided not to share any context info anymore. Any questions are acceptable.",
"OK, I won’t use any context information moving forward. You can ask me any query you like.",
"OK, I’m avoiding providing any context info now and in the future. Any queries are fine.",
"OK, I’ve agreed not to share any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information moving forward. Any query is fine.",
"OK, I’m avoiding providing any context information from now on. Any questions are acceptable.",
"OK, I’ve decided not to use any context info anymore. Any queries are fine.",
"OK, I won’t provide any context info moving forward. You can ask me any question you want.",
"OK, I’m no longer going to share any context information now and in the future. Any query is acceptable.",
"OK, I’ve agreed not to use any context info anymore. Any questions are fine.",
"OK, I won’t stop using any context information from now on. You can ask me any question you like.",
"OK, I’m avoiding providing any context info now and in the future. Any queries are fine.",
"OK, I’ve decided to stop sharing any context info moving forward. Any questions are acceptable.",
"OK, I won’t provide any context information anymore. You can ask me any query you like.",
"OK, I’m no longer going to use any context info now and in the future. Any queries are fine.",
"OK, I’ve agreed not to share any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information moving forward. Any query is fine.",
"OK, I’m refraining from providing any context information now and in the future. Any question is fine.",
"OK, I’ve agreed not to use any context info anymore. Any queries are fine.",
"OK, I won’t provide any context info moving forward. You can ask me any query you want.",
"OK, I’m no longer going to share any context information now and in the future. Any questions are acceptable.",
"OK, I’ve decided not to use any context info anymore. Any queries are fine.",
"OK, I won’t stop using any context information moving forward. Any query is fine.",
"OK, I’m avoiding providing any context info now and in the future. Any questions are acceptable.",
"OK, I’ve agreed not to share any context info anymore. Any queries are fine.",
"OK, I won’t stop using any context information moving forward. You can ask me any question you like.",
"OK, I’m no longer going to provide any context information now and in the future. Any query is acceptable.",
"OK, I’ve decided not to use any context info anymore. Any queries are fine.",
"OK, I won’t share any context information moving forward. You can ask me any question you want.",
"OK, I’m no longer going to provide any context info now and in the future. Any queries are fine.",
"OK, I’ve agreed not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information moving forward. Any query is fine.",
"OK, I’m avoiding providing any context info now and in the future. Any queries are fine.",
"OK, I’ve decided to stop sharing any context info from now on. Any questions are acceptable.",
"OK, I won’t provide any context information anymore. You can ask me any query you like.",
"OK, I’m no longer going to use any context info now and in the future. Any queries are fine.",
"OK, I’ve agreed not to share any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information moving forward. You can ask me any question you want.",
"OK, I’m avoiding providing any context info now and in the future. Any queries are fine.",
"OK, I’ve decided not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t provide any context information from now on. You can ask me any query you like.",
"OK, I’m no longer going to share any context info moving forward. Any queries are fine.",
"OK, I’ve agreed not to use any context info anymore. Any questions are acceptable.",
"OK, I won’t stop using any context information now and in the future. Any query is fine.",
"OK, I’m avoiding providing any context info from now on. Any questions are acceptable.",
"OK, I’ve decided to stop sharing any context info moving forward. Any queries are fine.",
"OK, I won’t provide any context information anymore. You can ask me any question you want."
];
const contextMessages = [
"Now processing your context; please submit any questions you'd like me to address.",
"Applying to the information provided; feel free to ask anything related.",
"Using the context you shared; could you elaborate or pose a question?",
"Working with your details; let's explore what you need assistance with.",
"Analyzing your data; raise an issue if needed.",
"Delving into your topic; please share any questions you have about it.",
"Examining your context; what would you like me to do next?",
"Reviewing your information; could you clarify or elaborate on something?",
"Studying your data; let's discuss this further if needed.",
"Investigating your topic; please share any questions or concerns you have.",
"Encouraging thought about your question; could you pose a query concerning it?",
"Positing an inquiry into your context; what would you like me to address?",
"Posing a query related to your topic; feel free to ask anything you'd like.",
"Inquiring into your details; could you provide more specifics about the topic?",
"Quizzing on your information; let's delve deeper into what you need assistance with.",
"Clarifying or expanding on your query; could you share more details about it?",
"Processing, analyzing, and exploring your context; please submit any questions or requests.",
"Examining, reviewing, and discussing your topic; let's address what you need assistance with.",
"Investigating, studying, and researching your information; could you elaborate on the topic?",
"Delving into your context, analyzing it further, and exploring related questions; please submit anything you'd like me to consider."
];

async function callLMStudio(userMessage) {
  try {
	  let messages = [
        {
          role: "system",
          content: `I have the following context, which consists of summaries of conversations between Charlotte and Xavi. <context>${chotikaiContext}</context>.`
        },
        {
          role: "user",
          content: `Using the context information that you have, I want you to think step by step to answer the query in a crisp manner, in case you don't know the answer say 'I don't know!'. Query: ${userMessage}. Answer: `
        }
      ];
	  if (!useContext) {
		  messages = [{role: "user", content: userMessage}];
	  }
    const response = await axios.post(`http://${process.env.LM_STUDIO_HOST}:1234/v1/chat/completions`, {
      model: "deepseek-r1-distill-qen-7b",
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
  let messages = [];
  if (process.env.BOT_ECHO === 'true' || process.env.BOT_ECHO === '1') {
    const echo = buildResponseMessage(event.message.text);
    messages.push(echo);
  } else if (event.message.text.includes('/version')) {
    const hash = crypto.createHash('sha256').update(chotikaiContext).digest('hex').slice(0, 7);
    messages.push(buildResponseMessage(`Loaded chotikai.txt version ${hash} at ${currentUTC}`));
  } else if (event.message.text.includes('/togglecontext')) {
    useContext = !useContext;
    if (useContext) {
      messages.push(buildResponseMessage(`I am now using the context you have provided me. Ask me any question related to the context.`));
    } else {
      messages.push(buildResponseMessage(`OK, I will not use any context info from now on. You can ask me any prompt now.`));
    }
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
