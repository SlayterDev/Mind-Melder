export const chatTools = [
  {
    name: 'search_user_content',
    description: `Search the user's captures, organized notes, and todos. Use this when the user asks about their past notes, tasks, or information they've captured. Returns relevant items ranked by relevance.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (keywords or natural language question)'
        },
        types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['capture', 'note', 'todo']
          },
          description: 'Filter by content type. Omit to search all types.'
        },
        date_from: {
          type: 'string',
          description: 'ISO date string to search from (e.g., "2024-01-20")'
        },
        date_to: {
          type: 'string',
          description: 'ISO date string to search until'
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 8, max: 20)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_todays_todos',
    description: `Get all todos due today or overdue. Use when user asks about today's tasks or what they need to do.`,
    input_schema: {
      type: 'object',
      properties: {
        include_completed: {
          type: 'boolean',
          description: 'Include completed todos (default: false)'
        }
      }
    }
  },
  {
    name: 'get_recent_captures',
    description: `Get the most recent quick captures. Use when user asks "what did I capture recently?" or similar.`,
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of captures to return (default: 10, max: 50)'
        },
        hours: {
          type: 'number',
          description: 'Only return captures from the last N hours'
        }
      }
    }
  }
];
