# AgentMail Module

This module provides integration with the AgentMail API for managing email inboxes and threads.

## Features

- List all inboxes
- List email threads with filtering options
- Get specific thread by ID
- Download thread attachments

## Setup

1. Install the agentmail package:
```bash
npm install agentmail
```

2. Add your AgentMail API key to the `.env` file:
```
AGENTMAIL_API_KEY=your_api_key_here
```

## API Endpoints

### List Inboxes
```
GET /agentmail/inboxes
```

Returns a list of all available inboxes.

### List Threads
```
GET /agentmail/threads?limit=10&ascending=true
```

Query parameters:
- `limit` (optional): Number of threads to return
- `pageToken` (optional): Pagination token
- `labels` (optional): Array of label filters
- `before` (optional): Date-time filter for threads before a specific time
- `after` (optional): Date-time filter for threads after a specific time
- `ascending` (optional): Boolean to control sort order

### Get Thread
```
GET /agentmail/threads/:threadId
```

Returns detailed information about a specific thread.

### Get Thread Attachment
```
GET /agentmail/threads/:threadId/attachments/:attachmentId
```

Downloads a specific attachment from a thread.

## Service Methods

The `AgentMailService` provides the following methods:

- `listInboxes()`: Fetch all inboxes
- `listThreads(params?: ListThreadsDto)`: Fetch threads with optional filters
- `getThread(threadId: string)`: Get a specific thread by ID
- `getThreadAttachment(threadId: string, attachmentId: string)`: Get a thread attachment

## References

- [AgentMail SDK](https://github.com/agentmail-to/agentmail-node)
- [AgentMail API Documentation](https://docs.agentmail.to/)
