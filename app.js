import * as line from '@line/bot-sdk'
import express from 'express'
import axios from 'axios'
import * as fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { Duffel } from '@duffel/api'
import * as authenticator from 'authenticator'
import { google } from 'googleapis'

const duffel = new Duffel({
  token: process.env.DUFFEL_TOKEN,
})

// Google Sheets configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

// Column mapping based on: Invited by, First name, Last name, Nickname, Country, Phone, Email, Travel Party, Travel Origin, Total guest(s), Response
const COLUMN_MAP = {
  INVITED_BY: 0,
  FIRST_NAME: 1,
  LAST_NAME: 2,
  NICKNAME: 3,
  COUNTRY: 4,
  PHONE: 5,
  EMAIL: 6,
  TRAVEL_PARTY: 7,
  TRAVEL_ORIGIN: 8,
  TOTAL_GUESTS: 9,
  RESPONSE: 10
};

// Initialize Google Sheets client
function getGoogleSheetsClient() {
  try {
    const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

// Search for guest by first and last name
async function searchGuest(firstName, lastName) {
  try {
    const sheets = getGoogleSheetsClient();

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_SHEET_NAME}!A:K`, // Columns A through K (11 columns)
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { found: false };
    }

    // Skip header row, start from index 1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowFirstName = (row[COLUMN_MAP.FIRST_NAME] || '').trim().toLowerCase();
      const rowLastName = (row[COLUMN_MAP.LAST_NAME] || '').trim().toLowerCase();

      if (rowFirstName === firstName.toLowerCase() && rowLastName === lastName.toLowerCase()) {
        // Found the guest! Now find all members of their travel party
        const travelParty = row[COLUMN_MAP.TRAVEL_PARTY] || '';

        // Get all guests in the same travel party
        const partyMembers = [];
        for (let j = 1; j < rows.length; j++) {
          const partyRow = rows[j];
          if ((partyRow[COLUMN_MAP.TRAVEL_PARTY] || '') === travelParty && travelParty !== '') {
            partyMembers.push({
              firstName: partyRow[COLUMN_MAP.FIRST_NAME] || '',
              lastName: partyRow[COLUMN_MAP.LAST_NAME] || '',
              nickname: partyRow[COLUMN_MAP.NICKNAME] || '',
              email: partyRow[COLUMN_MAP.EMAIL] || '',
              country: partyRow[COLUMN_MAP.COUNTRY] || '',
              phone: partyRow[COLUMN_MAP.PHONE] || '',
              travelParty: partyRow[COLUMN_MAP.TRAVEL_PARTY] || '',
              travelOrigin: partyRow[COLUMN_MAP.TRAVEL_ORIGIN] || '',
              rowIndex: j + 1, // +1 because sheet rows are 1-indexed
              id: `guest-${j}`
            });
          }
        }

        // Return the found guest and their party
        return {
          found: true,
          guest: {
            firstName: row[COLUMN_MAP.FIRST_NAME] || '',
            lastName: row[COLUMN_MAP.LAST_NAME] || '',
            nickname: row[COLUMN_MAP.NICKNAME] || '',
            email: row[COLUMN_MAP.EMAIL] || '',
            country: row[COLUMN_MAP.COUNTRY] || '',
            phone: row[COLUMN_MAP.PHONE] || '',
            travelParty: row[COLUMN_MAP.TRAVEL_PARTY] || '',
            travelOrigin: row[COLUMN_MAP.TRAVEL_ORIGIN] || '',
            rowIndex: i + 1
          },
          party: partyMembers.length > 0 ? partyMembers : [{
            firstName: row[COLUMN_MAP.FIRST_NAME] || '',
            lastName: row[COLUMN_MAP.LAST_NAME] || '',
            nickname: row[COLUMN_MAP.NICKNAME] || '',
            email: row[COLUMN_MAP.EMAIL] || '',
            country: row[COLUMN_MAP.COUNTRY] || '',
            phone: row[COLUMN_MAP.PHONE] || '',
            travelParty: row[COLUMN_MAP.TRAVEL_PARTY] || '',
            travelOrigin: row[COLUMN_MAP.TRAVEL_ORIGIN] || '',
            rowIndex: i + 1,
            id: `guest-${i}`
          }]
        };
      }
    }

    return { found: false };
  } catch (error) {
    console.error('Error searching for guest:', error);
    throw error;
  }
}

// Update Response column for a guest
async function updateGuestResponse(rowIndex, responseText) {
  try {
    const sheets = getGoogleSheetsClient();

    // Column K is the Response column (index 10, which is column K in A1 notation)
    const range = `${GOOGLE_SHEET_NAME}!K${rowIndex}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[responseText]]
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating guest response:', error);
    throw error;
  }
}

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

// Oboda Thai landing page
app.get('/oboda/th', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'oboda-th.html'));
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

// Search for guest by first and last name
app.get('/wedding/rsvp/search', async (req, res) => {
  try {
    const { firstName, lastName } = req.query;

    if (!firstName || !lastName) {
      return res.status(400).json({
        found: false,
        message: 'First name and last name are required'
      });
    }

    const result = await searchGuest(firstName, lastName);
    res.json(result);
  } catch (error) {
    console.error('Error in /wedding/rsvp/search:', error);
    res.status(500).json({
      found: false,
      message: 'An error occurred while searching for guest'
    });
  }
});

app.get('/wedding/rsvp', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'views', 'wedding-rsvp.html'));
});

app.post('/wedding/rsvp', async (req, res) => {
  try {
    console.log('RSVP Submission:', req.body);

    // Extract RSVP data
    const { searchedFirstName, searchedLastName, foundGuest, party, attendance, dietary } = req.body;

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
      searchedName: `${searchedFirstName} ${searchedLastName}`,
      foundGuest: `${foundGuest.firstName} ${foundGuest.lastName}`,
      responses: []
    };

    // Update Google Sheets for each party member's response
    const updatePromises = [];

    Object.values(attendance).forEach(guest => {
      const displayName = guest.displayName || `${guest.firstName} ${guest.lastName}`;
      const dietaryInfo = dietary && dietary[displayName] ? dietary[displayName] : '';

      // Create response text
      let responseText = guest.status === 'accepted' ? 'Accepted' : 'Declined';
      if (guest.status === 'accepted' && dietaryInfo) {
        responseText += ` (Dietary: ${dietaryInfo})`;
      }

      // Add to summary
      rsvpSummary.responses.push({
        name: displayName,
        attending: guest.status === 'accepted',
        dietary: dietaryInfo || null
      });

      // Update the row in Google Sheets if we have a rowIndex
      if (guest.rowIndex) {
        updatePromises.push(
          updateGuestResponse(guest.rowIndex, responseText)
            .catch(error => {
              console.error(`Error updating response for ${displayName}:`, error);
              return { success: false, error: error.message };
            })
        );
      }
    });

    // Wait for all updates to complete
    const updateResults = await Promise.all(updatePromises);

    // Check if any updates failed
    const failedUpdates = updateResults.filter(r => !r.success);
    if (failedUpdates.length > 0) {
      console.error('Some updates failed:', failedUpdates);
    }

    console.log('Processed RSVP:', rsvpSummary);

    res.json({
      status: 'success',
      message: 'RSVP received successfully!',
      summary: rsvpSummary,
      updatesSuccess: failedUpdates.length === 0
    });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing your RSVP'
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
