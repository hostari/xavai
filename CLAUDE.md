# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**xavai** is a LINE bot designed as a social interaction concierge that helps navigate real-world relationships. The bot:
- Processes Instagram chat data and social interaction notes  
- Uses a 128k token context to understand relationship dynamics
- Integrates with LM Studio running locally for AI processing
- Provides concierge-like assistance for social situations

## Architecture

### Core Components

**Main Application (`app.js`)**
- Express.js server handling LINE webhook events
- LM Studio integration via HTTP API at `localhost:1234`
- Uses `deepseek-r1-distill-qwen-7b` model
- Bot responds only when mentioned by name (`@BOT_NAME`)
- Supports echo mode and think tag removal

**Data Processing Pipeline**
- `chunk_text.py`: Splits large conversation files into manageable chunks (~8k tokens each)
- `combine_summaries.sh`: Merges chunk summaries into unified context
- `count_summary_tokens.py`: Token counting utility using GPT-4 tokenizer

**Additional Features**
- Travel integration via Duffel API
- 2FA token generator for MSCS PHIC
- Queue management system for restaurants
- Static file serving for various interfaces

### Key Integration Points

**LM Studio Server**
- Runs locally on port 1234
- Expects host configured via `LM_STUDIO_HOST` environment variable
- Processes user messages with conversation context

**LINE Bot Integration**
- Webhook endpoint: `/line/webhook`
- Requires `LINE_CHANNEL_SECRET` and `LINE_CHANNEL_ACCESS_TOKEN`
- Only responds to messages containing bot's mention

## Environment Configuration

Required environment variables:
- `LINE_CHANNEL_SECRET`: LINE bot webhook validation
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE messaging API access
- `BOT_NAME`: Bot mention trigger (without @ symbol)
- `LM_STUDIO_HOST`: LM Studio server hostname
- `DUFFEL_TOKEN`: Travel booking API access
- `MSCS_PHIC_2FA_KEY`: 2FA token generation

Optional configuration:
- `BOT_ECHO`: Enable echo mode (bypasses LM Studio)
- `LOG_LM_STUDIO`: Enable LM Studio request/response logging
- `REMOVE_THINK_TAGS`: Strip `<think>` tags from responses

## Development Commands

**Start Application**
```bash
node app.js
```

**Install Dependencies**
```bash
npm install
```

**Docker Deployment**
```bash
docker build -t xavai .
docker run -p 3000:3000 xavai
```

**Data Processing**
```bash
# Split conversation file into chunks
python chunk_text.py

# Generate summaries for specific chunk range
python -c "from chunk_text import create_summaries_range; create_summaries_range(1, 10)"

# Combine all summaries
./combine_summaries.sh

# Count tokens in summary file
python count_summary_tokens.py
```

## File Structure Context

- `public/`: Static assets including QR codes for various payment systems
- `views/`: HTML templates for web interfaces (AutoQ queue system, Masungi reservation)
- `chotikai*.txt`: Conversation data files and processed chunks/summaries
- `mise.toml`: Development environment configuration

## API Endpoints

- `GET /`: Basic health check
- `GET /up`: Service status endpoint
- `POST /line/webhook`: LINE bot message processing
- `GET /autoq`: Restaurant queue management interface
- `GET /masungi-georeserve`: Reservation system
- `GET /2fa/mscs-phic`: 2FA token generator with auto-refresh