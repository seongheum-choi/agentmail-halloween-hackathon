# Google Calendar Query Feature

## Overview

This feature allows users to query their Google Calendar schedule through Hyperspell's memory search API. The integration enables natural language queries to retrieve calendar events and scheduling information.

## Implementation

### New Files

1. **src/agent/dto/calendar-query.dto.ts**
   - DTO for calendar query requests
   - Validates query parameters

2. **src/agent/services/hyperspell.service.spec.ts**
   - Comprehensive test coverage for Hyperspell service
   - Tests for calendar query functionality

### Modified Files

1. **src/agent/services/hyperspell.service.ts**
   - Added `queryCalendar()` method
   - Queries only Google Calendar source
   - Returns both AI-generated answer and document results

2. **src/agent/agent.controller.ts**
   - Added `POST /agent/calendar/query` endpoint
   - Imports CalendarQueryDto

## API Usage

### Endpoint

```
POST /agent/calendar/query
```

### Request Body

```json
{
  "query": "What meetings do I have tomorrow?",
  "userId": "user123",
  "answer": true
}
```

**Parameters:**
- `query` (required, string): Natural language query about calendar events
- `userId` (optional, string): User identifier (defaults to "anonymous")
- `answer` (optional, boolean): Whether to generate AI answer (defaults to true)

### Response

```json
{
  "answer": "You have a team meeting at 2pm tomorrow and a 1-on-1 with Sarah at 4pm.",
  "documents": [
    {
      "title": "Team Meeting",
      "content": "Weekly team sync",
      "source": "google_calendar",
      "metadata": {
        "start_time": "2025-11-02T14:00:00Z",
        "end_time": "2025-11-02T15:00:00Z"
      }
    }
  ]
}
```

## Prerequisites

### 1. Hyperspell API Key

Set the `HYPERSPELL_API_KEY` in your `.env` file:

```bash
HYPERSPELL_API_KEY=hs-your-api-key-here
```

### 2. Connect Google Calendar

Users must first connect their Google Calendar account to Hyperspell:

1. Get the connection URL:
   ```
   GET /agent/hyperspell/connect-url?userId=user123
   ```

2. Visit the returned `connectUrl` and authorize Google Calendar access

3. Once connected, calendar queries will return results

## Example Queries

```bash
# Check today's schedule
curl -X POST http://localhost:3000/agent/calendar/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is on my calendar today?",
    "userId": "user123"
  }'

# Find specific meetings
curl -X POST http://localhost:3000/agent/calendar/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "When is my meeting with John?",
    "userId": "user123"
  }'

# Check availability
curl -X POST http://localhost:3000/agent/calendar/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Am I free next Tuesday afternoon?",
    "userId": "user123"
  }'
```

## Error Handling

The service throws `BadRequestException` in the following cases:

1. **Missing API Key**: `HYPERSPELL_API_KEY is not configured`
2. **Invalid API Key**: `Failed to query Google Calendar: [error message]`
3. **Calendar Not Connected**: User hasn't authorized Google Calendar access
4. **Search Failures**: Network issues or API errors

## Testing

Run the test suite:

```bash
npm test -- hyperspell.service.spec.ts
```

The tests cover:
- User token generation
- General memory search
- Calendar-specific queries
- Error handling
- Default parameter handling
- Document parsing

## Architecture

The implementation follows NestJS patterns:

```
┌─────────────────┐
│ AgentController │
│  POST /calendar │
│     /query      │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ HyperspellService   │
│  queryCalendar()    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Hyperspell SDK     │
│  memories.search()  │
│  source: calendar   │
└─────────────────────┘
```

## Future Enhancements

Potential improvements:
1. Add date range filtering
2. Support calendar event creation
3. Add recurring event queries
4. Implement calendar conflict detection
5. Add attendee-based searches
6. Support multiple calendar sources

## Related Documentation

- [Hyperspell API Documentation](https://docs.hyperspell.com)
- [NestJS Documentation](https://docs.nestjs.com)
- [Google Calendar API](https://developers.google.com/calendar)
