# TrapStr UFO Bot 🛸

A Telegram bot for managing a digital menu system with secure order processing.

## Features

- 📸 Upload and manage menu items with photos
- 💰 Multiple quantity options with pricing
- 🛒 Shopping cart functionality
- 🔔 Real-time order notifications
- 📊 Order status tracking
- 🔐 Secure admin controls

## Prerequisites

- Node.js (v14 or higher)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Telegram Account (for admin access)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd trap-str-ufo
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
BOT_TOKEN=your_bot_token_here
ADMIN_USERNAME=your_telegram_username
ADMIN_CHAT_ID=your_chat_id
PORT=3000
NODE_ENV=development
IMAGES_PATH=src/data/images
```

5. Build the project:
```bash
npm run build
```

6. Start the bot:
```bash
npm start
```

## Deployment to Glitch

1. Create a new project on [Glitch](https://glitch.com)
2. Import this repository
3. Add your environment variables in the Glitch project settings
4. The bot will automatically start running

## Usage

### Customer Commands
- `/start` - Start ordering
- `/menu` - View available items
- `/cart` - View your cart
- `/help` - Show help message

### Admin Commands
- `/additem` - Add new menu item
- `/toggle [itemId]` - Toggle item availability
- `/delete [itemId]` - Delete menu item
- `/intransit [orderId]` - Mark order as in transit
- `/delivered [orderId]` - Mark order as delivered

### Adding Menu Items (Admin)
1. Use `/additem` command
2. Send a photo with caption in the format:
```
Name
Description
Quantity1 (price)
Quantity2 (price)
...
```

Example:
```
Premium Flower
Top shelf indoor
2g (15)
1/8 (25)
1/4 (45)
1/2 (80)
⚡️ (145)
```

### Updating Items (Admin)
Send a photo with caption starting with `ID:[itemId]` followed by the new details in the same format as adding items.

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## Project Structure

```
src/
├── controllers/     # Request handlers
├── middleware/      # Custom middleware
├── types/          # TypeScript type definitions
├── utils/          # Helper functions
└── data/
    └── images/     # Uploaded menu item images
```

## Security Features

- Rate limiting to prevent abuse
- Admin-only commands verification
- Secure image handling
- Input validation and sanitization

## Error Handling

The bot includes comprehensive error handling:
- Invalid command formats
- Missing permissions
- Network issues
- Image upload failures

## Data Storage

The bot uses in-memory storage for:
- Menu items
- Orders
- Shopping carts
- Customer sessions

Note: Data is not persistent and will be cleared when the bot restarts.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
