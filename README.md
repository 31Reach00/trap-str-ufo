# TrapStr UFO Bot

A Telegram bot for TrapStr UFO.

## Features

- Menu management
- Order processing
- Admin controls
- Cart functionality

## Deployment

This bot is configured to be deployed on Render.com for 24/7 operation.

### Deploying to Render

1. Create a Render account at https://render.com
2. Connect your GitHub repository
3. Create a new Web Service
4. Use the following settings:
   - Name: trap-str-ufo
   - Environment: Node
   - Build Command: `npm install && mkdir -p /data/images`
   - Start Command: `npm start`
   - Plan: Free

The bot will automatically be deployed and will run 24/7 without requiring your PC to be on.

### Local Development

To run the bot locally:

```bash
npm install
node bot.js
```

## Environment Variables

The following environment variables are required:

- `BOT_TOKEN`: Your Telegram bot token
- `ADMIN_USERNAME`: Username of the admin
- `ADMIN_CHAT_ID`: Chat ID of the admin
- `SERVER_PORT`: Port for the server (default: 3000)
- `IMAGES_PATH`: Path to store images (default: /data/images)
- `WEBHOOK_URL`: URL for the webhook (for production)
