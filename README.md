# AccuWeather MCP Server

MCP server providing weather forecasts and current conditions from AccuWeather API.

## Features

- **Weather Forecast**: Get daily forecasts (1-15 days) with temperature, precipitation probability, wind, and conditions
- **Current Conditions**: Get real-time weather data including temperature, humidity, wind, and precipitation
- **Global Coverage**: Works with coordinates worldwide (not limited to specific regions)

## Tools

1. **`get_weather_forecast`**: Returns daily weather forecasts with temperature ranges, precipitation probability, wind speed, and conditions
2. **`get_current_conditions`**: Returns current weather conditions including temperature, humidity, wind, and precipitation status

## Setup

### Prerequisites

- Node.js 18+ 
- AccuWeather API key ([Get one here](https://developer.accuweather.com/))

### Installation

```bash
npm install
npm run build
```

### Environment Variables

```bash
ACCUWEATHER_API_KEY=your_api_key_here
PORT=3001  # Optional, defaults to 3001
ALLOWED_ORIGINS=https://yourdomain.com  # Optional, defaults to *
```

### Running

```bash
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /` - Server information
- `POST /mcp` - MCP protocol endpoint

## MCP Protocol

The server implements the Model Context Protocol (MCP) for AI agent integration.

### Custom Headers

- `X-Farm-Latitude`: Default latitude if not provided in tool parameters
- `X-Farm-Longitude`: Default longitude if not provided in tool parameters

## Deployment

### Railway

Create a `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Example Usage

### Get Weather Forecast

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weather_forecast",
    "arguments": {
      "latitude": -1.2864,
      "longitude": 36.8172,
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
    "name": "get_current_conditions",
    "arguments": {
      "latitude": -1.2864,
      "longitude": 36.8172
    }
  }
}
```

## Technical Features

- **Input Validation**: Validates latitude, longitude, and day parameters
- **Timeout Handling**: 30-second timeout for all API requests
- **Error Handling**: Comprehensive error messages for API failures
- **Graceful Shutdown**: Handles SIGTERM and SIGINT signals
- **Response Validation**: Validates API response structure

## Response Format

### Forecast Response

```json
{
  "location": {
    "latitude": -1.2864,
    "longitude": 36.8172,
    "name": "Nairobi",
    "country": "Kenya",
    "region": "Nairobi"
  },
  "current": {
    "temperature": 22,
    "temp_unit": "C",
    "conditions": "Partly Cloudy",
    "humidity": 65,
    "wind_speed": 15,
    "wind_unit": "km/h",
    "wind_direction": "SW"
  },
  "forecast": [
    {
      "date": "2025-11-05",
      "max_temp": 26,
      "min_temp": 14,
      "temp_unit": "C",
      "day_conditions": "Partly Cloudy",
      "day_precipitation_probability": 20,
      "night_conditions": "Clear",
      "night_precipitation_probability": 10,
      "wind_speed": 18,
      "wind_unit": "km/h"
    }
  ],
  "data_source": "AccuWeather API"
}
```

## License

MIT

