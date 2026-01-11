# Project Structure

```
Travel-MCP-with-APIM/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD workflow
├── .vscode/
│   └── mcp.json                    # VS Code MCP configuration
├── docs/
│   └── API_INTEGRATION.md          # API integration guide
├── infra/
│   ├── main.bicep                  # Main Bicep infrastructure template
│   └── main.parameters.json        # Bicep deployment parameters
├── src/
│   ├── services/
│   │   ├── skyscanner.ts           # Skyscanner API client
│   │   ├── metoffice.ts            # Met Office API client
│   │   ├── tripadvisor.ts          # TripAdvisor API client
│   │   └── lonelyplanet.ts         # Lonely Planet curated data
│   └── index.ts                    # Main MCP server implementation
├── .dockerignore                   # Docker ignore file
├── .env.example                    # Example environment variables
├── .gitignore                      # Git ignore file
├── deploy.bat                      # Windows deployment script
├── deploy.sh                       # Linux/Mac deployment script
├── docker-compose.yml              # Docker Compose configuration
├── Dockerfile                      # Docker container definition
├── package.json                    # Node.js dependencies
├── README.md                       # Main documentation
└── tsconfig.json                   # TypeScript configuration
```

## Key Files Description

### Infrastructure (`infra/`)
- **main.bicep**: Defines all Azure resources (Web App, APIM, App Insights, Log Analytics)
- **main.parameters.json**: Configuration parameters including API keys

### Source Code (`src/`)
- **index.ts**: Main MCP server with tool definitions and handlers
- **services/skyscanner.ts**: Flight search integration
- **services/metoffice.ts**: Weather forecast integration
- **services/tripadvisor.ts**: Attractions and restaurants integration
- **services/lonelyplanet.ts**: Curated travel guide data

### Deployment
- **deploy.sh** / **deploy.bat**: Automated deployment scripts
- **Dockerfile**: Container definition for Docker deployment
- **.github/workflows/deploy.yml**: Automated CI/CD pipeline

### Documentation
- **README.md**: Main project documentation
- **docs/API_INTEGRATION.md**: Detailed API integration guide
