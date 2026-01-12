import express, { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SkyscannerClient } from './services/skyscanner.js';
import { MetOfficeClient } from './services/metoffice.js';
import { TripAdvisorClient } from './services/tripadvisor.js';

// Define available destinations with detailed information
const destinations = [
  {
    id: 'paris',
    name: 'Paris, France',
    description: 'The City of Light, famous for the Eiffel Tower, Louvre Museum, and romantic atmosphere',
    attractions: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Arc de Triomphe', 'Champs-Élysées'],
    bestTimeToVisit: 'April to June, September to October',
    averageCost: '$150-300 per day',
    climate: 'Temperate oceanic climate'
  },
  {
    id: 'tokyo',
    name: 'Tokyo, Japan',
    description: 'A vibrant metropolis blending ultra-modern with traditional culture',
    attractions: ['Tokyo Skytree', 'Senso-ji Temple', 'Shibuya Crossing', 'Meiji Shrine', 'Tsukiji Market'],
    bestTimeToVisit: 'March to May, September to November',
    averageCost: '$100-250 per day',
    climate: 'Humid subtropical climate'
  },
  {
    id: 'newyork',
    name: 'New York City, USA',
    description: 'The Big Apple, a global hub of culture, finance, and entertainment',
    attractions: ['Statue of Liberty', 'Central Park', 'Times Square', 'Empire State Building', 'Brooklyn Bridge'],
    bestTimeToVisit: 'April to June, September to November',
    averageCost: '$200-400 per day',
    climate: 'Humid subtropical climate'
  },
  {
    id: 'barcelona',
    name: 'Barcelona, Spain',
    description: 'Known for its art, architecture, and Mediterranean beaches',
    attractions: ['Sagrada Familia', 'Park Güell', 'La Rambla', 'Gothic Quarter', 'Casa Batlló'],
    bestTimeToVisit: 'May to June, September to October',
    averageCost: '$100-200 per day',
    climate: 'Mediterranean climate'
  },
  {
    id: 'sydney',
    name: 'Sydney, Australia',
    description: 'Famous for its harbor, opera house, and beautiful beaches',
    attractions: ['Sydney Opera House', 'Sydney Harbour Bridge', 'Bondi Beach', 'Taronga Zoo', 'Royal Botanic Garden'],
    bestTimeToVisit: 'September to November, March to May',
    averageCost: '$150-300 per day',
    climate: 'Humid subtropical climate'
  }
];

// Travel tips database
const travelTips = {
  packing: [
    'Pack light and versatile clothing',
    'Bring a portable charger and universal adapter',
    'Keep important documents in a waterproof bag',
    'Pack medication in carry-on luggage',
    'Roll clothes to save space'
  ],
  safety: [
    'Keep copies of important documents',
    'Register with your embassy',
    'Get travel insurance',
    'Stay aware of your surroundings',
    'Keep emergency contacts accessible'
  ],
  budgeting: [
    'Set a daily spending limit',
    'Use local currency',
    'Eat where locals eat',
    'Book accommodations in advance',
    'Use public transportation'
  ],
  cultural: [
    'Learn basic phrases in the local language',
    'Research local customs and etiquette',
    'Dress appropriately for the culture',
    'Be respectful of local traditions',
    'Try local cuisine'
  ]
};

// MCP Server implementation
class TravelMCPServer {
  private server: Server;
  private skyscanner: SkyscannerClient;
  private metOffice: MetOfficeClient;
  private tripAdvisor: TripAdvisorClient;

  constructor() {
    // Initialize API clients
    this.skyscanner = new SkyscannerClient();
    this.metOffice = new MetOfficeClient();
    this.tripAdvisor = new TripAdvisorClient();
    this.server = new Server(
      {
        name: 'travel-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_destination_info',
            description: 'Get detailed information about a travel destination including attractions, best time to visit, and costs',
            inputSchema: {
              type: 'object',
              properties: {
                destination: {
                  type: 'string',
                  description: 'The destination to get information about (e.g., paris, tokyo, newyork, barcelona, sydney)',
                },
              },
              required: ['destination'],
            },
          },
          {
            name: 'list_destinations',
            description: 'List all available travel destinations with brief descriptions',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_travel_tips',
            description: 'Get travel tips for a specific category',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Category of travel tips (packing, safety, budgeting, cultural)',
                  enum: ['packing', 'safety', 'budgeting', 'cultural'],
                },
              },
              required: ['category'],
            },
          },
          {
            name: 'search_destinations',
            description: 'Search destinations by keyword in name or description',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find destinations',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_flights',
            description: 'Search for flights between two locations (information only, no booking)',
            inputSchema: {
              type: 'object',
              properties: {
                origin: {
                  type: 'string',
                  description: 'Origin airport code or city (e.g., JFK, London)',
                },
                destination: {
                  type: 'string',
                  description: 'Destination airport code or city',
                },
                departDate: {
                  type: 'string',
                  description: 'Departure date in YYYY-MM-DD format',
                },
                returnDate: {
                  type: 'string',
                  description: 'Return date in YYYY-MM-DD format (optional for one-way)',
                },
                adults: {
                  type: 'number',
                  description: 'Number of adult passengers (default: 1)',
                },
                cabinClass: {
                  type: 'string',
                  description: 'Cabin class preference',
                  enum: ['economy', 'premium_economy', 'business', 'first'],
                },
              },
              required: ['origin', 'destination', 'departDate'],
            },
          },
          {
            name: 'get_weather_forecast',
            description: 'Get weather forecast for a destination',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location to get weather forecast for',
                },
                days: {
                  type: 'number',
                  description: 'Number of days to forecast (1-7, default: 5)',
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'search_attractions',
            description: 'Search for attractions and things to do in a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location to search for attractions',
                },
                category: {
                  type: 'string',
                  description: 'Category filter (e.g., museum, park, historic)',
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'search_restaurants',
            description: 'Search for restaurants in a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location to search for restaurants',
                },
                cuisine: {
                  type: 'string',
                  description: 'Cuisine type filter (e.g., Italian, Japanese)',
                },
              },
              required: ['location'],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Existing tools
        if (name === 'list_destinations') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  destinations.map(d => ({
                    id: d.id,
                    name: d.name,
                    description: d.description,
                  })),
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (name === 'get_destination_info') {
          if (!args || !args.destination) {
            return {
              content: [{ type: 'text', text: 'Missing required argument: destination' }],
              isError: true,
            };
          }
          
          const destination = destinations.find(
            d => d.id === (args.destination as string).toLowerCase() || 
                 d.name.toLowerCase().includes((args.destination as string).toLowerCase())
          );

          if (!destination) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Destination "${args.destination}" not found. Available destinations: ${destinations.map(d => d.id).join(', ')}`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(destination, null, 2),
              },
            ],
          };
        }

        if (name === 'get_travel_tips') {
          if (!args || !args.category) {
            return {
              content: [{ type: 'text', text: 'Missing required argument: category' }],
              isError: true,
            };
          }
          
          const category = args.category as keyof typeof travelTips;
          
          if (!travelTips[category]) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Category "${args.category}" not found. Available categories: ${Object.keys(travelTips).join(', ')}`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  category,
                  tips: travelTips[category],
                }, null, 2),
              },
            ],
          };
        }

        if (name === 'search_destinations') {
          const query = (args?.query as string)?.toLowerCase() || '';
          const results = destinations.filter(
            d => d.name.toLowerCase().includes(query) || 
                 d.description.toLowerCase().includes(query) ||
                 d.attractions.some(a => a.toLowerCase().includes(query))
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        // New external API tools
        if (name === 'search_flights') {
          if (!args || !args.origin || !args.destination || !args.departDate) {
            return {
              content: [{ type: 'text', text: 'Missing required arguments: origin, destination, departDate' }],
              isError: true,
            };
          }
          
          const flights = await this.skyscanner.searchFlights({
            origin: args.origin as string,
            destination: args.destination as string,
            departDate: args.departDate as string,
            returnDate: args.returnDate as string | undefined,
            adults: args.adults as number | undefined,
            cabinClass: args.cabinClass as 'economy' | 'premium_economy' | 'business' | 'first' | undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  flights,
                  note: 'Flight information is for reference only. Please visit airline websites or travel agencies for booking.',
                }, null, 2),
              },
            ],
          };
        }

        if (name === 'get_weather_forecast') {
          if (!args || !args.location) {
            return {
              content: [{ type: 'text', text: 'Missing required argument: location' }],
              isError: true,
            };
          }
          
          const forecast = await this.metOffice.getForecast(
            args.location as string,
            (args.days as number) || 5
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(forecast, null, 2),
              },
            ],
          };
        }

        if (name === 'search_attractions') {
          if (!args || !args.location) {
            return {
              content: [{ type: 'text', text: 'Missing required argument: location' }],
              isError: true,
            };
          }
          
          const attractions = await this.tripAdvisor.searchAttractions(
            args.location as string,
            args.category as string | undefined
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(attractions, null, 2),
              },
            ],
          };
        }

        if (name === 'search_restaurants') {
          if (!args || !args.location) {
            return {
              content: [{ type: 'text', text: 'Missing required argument: location' }],
              isError: true,
            };
          }
          
          const restaurants = await this.tripAdvisor.searchRestaurants(
            args.location as string,
            args.cuisine as string | undefined
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(restaurants, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Travel MCP server running on stdio');
  }

  getExpressHandler() {
    return async (req: Request, res: Response) => {
      try {
        const { method, params } = req.body;

        if (method === 'tools/list') {
          const tools = await this.server.request(
            { method: 'tools/list' },
            ListToolsRequestSchema
          );
          return res.json(tools);
        }

        if (method === 'tools/call') {
          const result = await this.server.request(
            { method: 'tools/call', params },
            CallToolRequestSchema
          );
          return res.json(result);
        }

        res.status(400).json({ error: 'Invalid method' });
      } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Internal server error' 
        });
      }
    };
  }
}

// Check if running in HTTP mode (Azure Web App) or stdio mode (local)
const isHttpMode = process.env.HTTP_MODE === 'true' || process.env.PORT;

if (isHttpMode) {
  // HTTP mode for Azure Web App
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // MCP endpoint
  const mcpServer = new TravelMCPServer();
  app.post('/mcp', mcpServer.getExpressHandler());

  // Root endpoint with API information
  app.get('/', (req, res) => {
    res.json({
      name: 'Travel MCP Server',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        mcp: '/mcp (POST)',
      },
      documentation: 'Send POST requests to /mcp with MCP protocol messages',
    });
  });

  app.listen(port, () => {
    console.log(`Travel MCP Server listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  });
} else {
  // stdio mode for local MCP usage
  const mcpServer = new TravelMCPServer();
  mcpServer.run().catch(console.error);
}
