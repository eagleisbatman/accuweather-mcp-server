# AccuWeather MCP Server

[![Railway](https://railway.app/button.svg)](https://railway.app)

MCP (Model Context Protocol) server providing weather forecasts and current conditions from AccuWeather API. Designed for integration with AI agents via OpenAI Agent Builder.

## 🌟 Features

- **Weather Forecast**: Get daily forecasts (1-15 days) with temperature, precipitation probability, wind, and conditions
- **Current Conditions**: Get real-time weather data including temperature, humidity, wind, and precipitation
- **Global Coverage**: Works with coordinates worldwide (not limited to specific regions)
- **MCP Protocol**: Full Model Context Protocol implementation for AI agent integration
- **Production Ready**: Input validation, timeout handling, error handling, graceful shutdown

## 🛠️ Tools

The server exposes 2 MCP tools:

1. **`get_accuweather_weather_forecast`**: Returns daily weather forecasts with temperature ranges, precipitation probability, wind speed, and conditions
2. **`get_accuweather_current_conditions`**: Returns current weather conditions including temperature, humidity, wind, and precipitation status

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- AccuWeather API key ([Get one here](https://developer.accuweather.com/))

### Installation

```bash
npm install
npm run build
```

### Environment Variables

Create a `.env` file:

```bash
ACCUWEATHER_API_KEY=your_api_key_here
PORT=3001  # Optional, defaults to 3001
ALLOWED_ORIGINS=https://yourdomain.com  # Optional, defaults to *
```

### Running Locally

```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `PORT`).

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

Returns server status and configuration.

### Server Information
```bash
GET /
```

Returns server metadata and available tools.

### MCP Protocol Endpoint
```bash
POST /mcp
```

Main MCP protocol endpoint for tool calls. Accepts JSON-RPC 2.0 requests.

## 🔌 MCP Protocol

The server implements the Model Context Protocol (MCP) for AI agent integration.

### Custom Headers

- `X-Farm-Latitude`: Default latitude if not provided in tool parameters
- `X-Farm-Longitude`: Default longitude if not provided in tool parameters

These headers allow the chat widget to pass default coordinates that tools can use if coordinates are not explicitly provided in the tool call.

## 📋 Example Usage

### Get Weather Forecast

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_accuweather_weather_forecast",
    "arguments": {
      "latitude": 9.1450,
      "longitude": 38.7617,
      "days": 5
    }
  }
}
```

### Get Current Conditions

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_accuweather_current_conditions",
    "arguments": {
      "latitude": 9.1450,
      "longitude": 38.7617
    }
  }
}
```

## 🚂 Railway Deployment

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository: `https://github.com/eagleisbatman/accuweather-mcp-server`

### Step 2: Set Environment Variables

In Railway dashboard, add:
- `ACCUWEATHER_API_KEY`: Your AccuWeather API key
- `PORT`: (Optional) Server port (defaults to 3001)

### Step 3: Deploy

Railway will automatically:
1. Detect Node.js project
2. Run `npm install`
3. Run `npm run build`
4. Start server with `npm start`

The `railway.json` file configures the build and deployment process.

## 🔧 Technical Features

- **Input Validation**: Validates latitude (-90 to 90), longitude (-180 to 180), and days (1-15) parameters
- **Timeout Handling**: 30-second timeout for all AccuWeather API requests
- **Error Handling**: Comprehensive error messages for API failures
- **Graceful Shutdown**: Handles SIGTERM and SIGINT signals cleanly
- **Response Validation**: Validates AccuWeather API response structure
- **TypeScript**: Full type safety with TypeScript

## 📊 Response Format

### Forecast Response

```json
{
  "location": {
    "latitude": 9.145,
    "longitude": 38.7617,
    "name": "Sululta",
    "country": "Ethiopia",
    "region": "Oromia"
  },
  "current": {
    "temperature": 22.8,
    "temp_unit": "C",
    "conditions": "Mostly cloudy",
    "humidity": 30,
    "wind_speed": 14.8,
    "wind_unit": "km/h",
    "wind_direction": "ESE"
  },
  "period": {
    "days": 5,
    "start_date": "2025-11-05",
    "end_date": "2025-11-09"
  },
  "forecast": [
    {
      "date": "2025-11-05",
      "max_temp": 23.3,
      "min_temp": 10.5,
      "temp_unit": "C",
      "day_conditions": "Hazy sunshine",
      "day_precipitation_probability": 1,
      "night_conditions": "Mostly clear",
      "night_precipitation_probability": 1,
      "wind_speed": 11.1,
      "wind_unit": "km/h"
    }
  ],
  "data_source": "AccuWeather API"
}
```

## 🔗 Integration with OpenAI Agent Builder

This server is designed to work with OpenAI Agent Builder alongside other MCP servers:

1. **GAP MCP Server**: Weather for Kenya/East Africa
2. **SSFR MCP Server**: Fertilizer recommendations for Ethiopia
3. **AccuWeather MCP Server** (this server): Weather for Ethiopia and global locations

### Configuration in Agent Builder

1. Go to **Integrations** → **MCP Servers**
2. Add new MCP server:
   - **Name:** `accuweather-mcp`
   - **URL:** `https://accuweather-mcp-server.up.railway.app/mcp`
3. Enable tools in your Agent:
   - ✅ `get_accuweather_weather_forecast`
   - ✅ `get_accuweather_current_conditions`

See the [Multi-MCP Setup Guide](https://github.com/eagleisbatman/gap-chat-widget/blob/main/AGENT_BUILDER_MULTI_MCP_SETUP.md) for detailed configuration.

## 📝 Project Structure

```
accuweather-mcp-server/
├── src/
│   ├── index.ts              # Main server file
│   └── accuweather-client.ts # AccuWeather API client
├── dist/                      # Compiled JavaScript (generated, gitignored)
├── package.json
├── tsconfig.json
├── railway.json              # Railway deployment config
├── .gitignore
└── README.md
```

## 🔒 Security

- API keys are read from environment variables only
- Never commit API keys to git
- `.env` files are excluded via `.gitignore`
- CORS can be configured via `ALLOWED_ORIGINS` environment variable

## 📚 Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `express`: Web server framework
- `cors`: Cross-origin resource sharing
- `node-fetch`: HTTP client for API requests
- `zod`: Schema validation
- `dotenv`: Environment variable management

## 🐛 Troubleshooting

### API Key Issues

If you get 401 Unauthorized:
- Verify API key is active in AccuWeather Developer Portal
- Check account subscription tier (free tier has limitations)
- Verify IP whitelist restrictions (if enabled)

### Port Already in Use

If port 3001 is already in use:
- Set `PORT` environment variable to a different port
- Or stop the conflicting process

### Build Errors

If TypeScript build fails:
- Ensure Node.js 18+ is installed
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript version compatibility

## 📄 License

MIT

## 🔗 Related Projects

- [GAP Agriculture MCP Server](https://github.com/eagleisbatman/gap-agriculture-mcp) - Weather for Kenya/East Africa
- [SSFR MCP Server](https://github.com/eagleisbatman/ssfr-mcp-server) - Fertilizer recommendations for Ethiopia
- [GAP Chat Widget](https://github.com/eagleisbatman/gap-chat-widget) - Frontend chat interface

## 🤝 Contributing

This is a private project. For issues or questions, contact the repository owner.
