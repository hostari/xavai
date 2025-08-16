# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

xavai is a LINE bot that functions as a social interaction concierge. It ingests social data (Instagram chats, notes) and uses LM Studio running locally for AI processing with 128k token context. The project also includes a wedding website with flight booking integration and various utility tools.

## Commands

### Development
- **Start server**: `node app.js`
- **Install dependencies**: `npm install`

### Docker
- **Build image**: `docker build -t xavai .`
- **Run container**: `docker run -p 3000:3000 xavai`

### Data Processing Scripts
- **Chunk large text files**: `python chunk_text.py` (splits text into 8k token chunks for processing)
- **Count tokens in files**: `python count_summary_tokens.py`
- **Combine summaries**: `./combine_summaries.sh` (combines all chunk summaries into single file)

## Architecture

### Core Components

**Express.js Web Server** (`app.js`):
- LINE bot webhook handler at `/line/webhook`
- Wedding website routes (`/wedding/*`)
- Flight booking pages for different airports
- 2FA token generator for MSCS PHIC
- Queue management system for restaurants
- Static file serving from `public/` and `views/`

**LINE Bot Integration**:
- Uses `@line/bot-sdk` for messaging API
- Processes messages mentioning the bot by name
- Integrates with LM Studio for AI responses
- Supports echo mode for testing

**LM Studio Integration**:
- Local AI server running on port 1234
- Uses `deepseek-r1-distill-qwen-7b` model
- Handles conversation context up to 128k tokens
- Configurable think tag removal and logging

**Data Processing Pipeline**:
- `chunk_text.py`: Splits large conversation files into processable chunks
- Uses tiktoken for accurate token counting
- Generates summaries for each chunk via LM Studio
- `combine_summaries.sh`: Merges all summaries back together

### Dependencies
- **@line/bot-sdk**: LINE messaging platform integration
- **@duffel/api**: Flight booking API integration
- **express**: Web framework
- **axios**: HTTP client for API calls
- **authenticator**: 2FA token generation

### Environment Variables
- `LINE_CHANNEL_SECRET`: LINE bot channel secret
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE bot access token
- `DUFFEL_TOKEN`: Flight booking API token
- `LM_STUDIO_HOST`: LM Studio server host (default: localhost)
- `BOT_NAME`: Bot mention name for LINE messages
- `BOT_ECHO`: Enable echo mode (true/false)
- `LOG_LM_STUDIO`: Enable LM Studio request logging
- `REMOVE_THINK_TAGS`: Strip AI thinking tags from responses
- `MSCS_PHIC_2FA_KEY`: 2FA secret for token generation

### File Structure
- `views/`: HTML templates for wedding website and booking pages
- `public/`: Static assets (images, airport photos, QR codes)
- Python scripts for text processing and summarization
- Docker configuration for containerized deployment

### Key Features
- **Wedding Website**: Multi-page site with RSVP, travel info, photo gallery
- **Flight Integration**: Airport-specific booking pages with Duffel API
- **Restaurant Queue**: Digital queue system for Katsu Midori Thailand
- **Social AI**: Contextual conversation processing for relationship insights
- **2FA Service**: Time-based token generation with web interface