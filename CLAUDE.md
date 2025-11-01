# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentMail AI Agent** - NestJS-based REST API with Anthropic Claude AI integration for conversational AI capabilities.

**Tech Stack**: NestJS v10.3 | TypeScript v5.3 | Anthropic SDK v0.27 | Node.js v18+ | Jest

## Project Architecture

### Directory Structure
```
src/
├── agent/                          # AI Agent module
│   ├── services/openai.service.ts     # OpenAI SDK integration
│   ├── dto/chat-request.dto.ts        # Request validation
│   ├── agent.controller.ts            # POST /agent/chat endpoint
│   └── agent.service.ts               # Chat orchestration
├── common/                            # Shared utilities
│   ├── filters/http-exception.filter.ts  # Global error handling
│   └── interceptors/logging.interceptor.ts  # Request logging
├── app.module.ts                      # Root module
└── main.ts                            # Bootstrap (port 3000)
```

### Key Files
- [src/agent/services/openai.service.ts](src/agent/services/openai.service.ts) - Open AI integration
- [src/agent/agent.controller.ts](src/agent/agent.controller.ts) - Chat API endpoint
- [src/main.ts](src/main.ts) - App bootstrap with CORS & validation
- [.env.example](.env.example) - Required: ANTHROPIC_API_KEY

### API Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check
- `POST /agent/chat` - AI chat with conversation history

## General Workflow Rules (Override Root General Workflow Rules)
1. Create a new branch(e.g. `AGE-207`) for the feature of requested Linear Issue (e.g. AGE-207)
2. Get Linear Issue details from Linear MCP
3. Commit all changes to the repository
4. Push the branch to the repository
5. Create PR

## Development Rules
- ALWAYS use format `(#ISSUE-ID) message` for commits
