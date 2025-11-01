# AgentMail AI Agent

AI Agent built with NestJS framework for AgentMail Halloween Hackathon.

## Features

- **NestJS Framework**: Modern, scalable Node.js server-side framework
- **AI Integration**: Anthropic Claude integration for intelligent agent capabilities
- **Type Safety**: Full TypeScript implementation with strict typing
- **Validation**: Request validation using class-validator and class-transformer
- **Error Handling**: Global exception filters for consistent error responses
- **Logging**: Structured logging with NestJS Logger and custom interceptors
- **Testing**: Comprehensive unit and e2e test setup with Jest

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Anthropic API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AGE-6
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

## Running the Application

### Development mode
```bash
npm run start:dev
```

### Production mode
```bash
npm run build
npm run start:prod
```

The application will start on `http://localhost:3000`

## API Endpoints

### Health Check
```bash
GET /health
```

Returns the health status of the application.

### Chat with AI Agent
```bash
POST /agent/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

## Testing

### Run unit tests
```bash
npm run test
```

### Run e2e tests
```bash
npm run test:e2e
```

### Run tests with coverage
```bash
npm run test:cov
```

## Project Structure

```
src/
├── agent/                      # AI Agent module
│   ├── dto/                   # Data transfer objects
│   ├── services/              # AI service integrations
│   ├── agent.controller.ts    # Agent endpoints
│   ├── agent.service.ts       # Agent business logic
│   └── agent.module.ts        # Agent module definition
├── common/                     # Shared resources
│   ├── filters/               # Exception filters
│   └── interceptors/          # Logging interceptors
├── app.controller.ts          # Root controller
├── app.service.ts             # Root service
├── app.module.ts              # Root module
└── main.ts                    # Application entry point

test/                          # E2E tests
```

## Development

### Code formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `ANTHROPIC_MODEL` - Model to use (default: claude-3-5-sonnet-20241022)
- `NODE_ENV` - Environment (development/production)

## License

Apache-2.0

## Contributing

This is a hackathon project. Contributions are welcome!