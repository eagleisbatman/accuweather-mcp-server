import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { AccuWeatherClient } from './accuweather-client.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization', 'X-Farm-Latitude', 'X-Farm-Longitude']
}));

// Environment variables
const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY || '';
const PORT = process.env.PORT || 3001;

// Warn if token is missing
if (!ACCUWEATHER_API_KEY) {
  console.warn('⚠️  WARNING: ACCUWEATHER_API_KEY environment variable is not set!');
  console.warn('⚠️  Server will start but MCP tools will not work until token is configured.');
}

// Initialize AccuWeather Client
const accuWeatherClient = ACCUWEATHER_API_KEY ? new AccuWeatherClient(ACCUWEATHER_API_KEY) : null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'accuweather-mcp-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    accuWeatherApiConfigured: !!ACCUWEATHER_API_KEY
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AccuWeather MCP Server',
    version: '1.0.0',
    description: 'Weather forecasts and current conditions from AccuWeather API',
    endpoints: {
      health: '/health',
      mcp: '/mcp (POST)'
    },
    tools: [
      'get_accuweather_weather_forecast',
      'get_accuweather_current_conditions'
    ]
  });
});

// Main MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    // Extract default coordinates from custom headers
    const headerLat = req.headers['x-farm-latitude'] as string;
    const headerLon = req.headers['x-farm-longitude'] as string;
    const defaultLatitude = headerLat ? parseFloat(headerLat) : undefined;
    const defaultLongitude = headerLon ? parseFloat(headerLon) : undefined;

    if (defaultLatitude && defaultLongitude) {
      console.log(`[MCP] Using default coordinates from headers: lat=${defaultLatitude}, lon=${defaultLongitude}`);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Stateless
    });

    const server = new McpServer({
      name: 'accuweather-weather',
      version: '1.0.0',
      description: 'Weather forecasts and current conditions from AccuWeather API for global locations'
    });

    // Tool: Get Weather Forecast
    server.tool(
      'get_accuweather_weather_forecast',
      'Get weather forecast from AccuWeather API. Returns daily forecasts with temperature, precipitation probability, wind, and conditions.',
      {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
        days: z.number().min(1).max(15).default(5).optional().describe('Number of days to forecast (1-15, default: 5).')
      },
      async ({ latitude, longitude, days = 5 }) => {
        try {
          // Use header defaults if coordinates not provided, fallback to Nairobi
          const NAIROBI_LAT = -1.2864;
          const NAIROBI_LON = 36.8172;
          const lat = latitude ?? defaultLatitude ?? NAIROBI_LAT;
          const lon = longitude ?? defaultLongitude ?? NAIROBI_LON;

          console.log(`[MCP Tool] get_accuweather_weather_forecast called: lat=${lat}, lon=${lon}, days=${days}`);

          // Validate coordinates
          if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
            return {
              content: [{
                type: 'text',
                text: 'Invalid latitude coordinate. Please provide a valid latitude between -90 and 90.'
              }],
              isError: true
            };
          }
          if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
            return {
              content: [{
                type: 'text',
                text: 'Invalid longitude coordinate. Please provide a valid longitude between -180 and 180.'
              }],
              isError: true
            };
          }
          if (typeof days !== 'number' || days < 1 || days > 15) {
            return {
              content: [{
                type: 'text',
                text: 'Invalid number of days. Please provide a value between 1 and 15.'
              }],
              isError: true
            };
          }

          if (!accuWeatherClient) {
            return {
              content: [{
                type: 'text',
                text: 'I\'m having trouble connecting to the weather data service. Try again in a moment?'
              }],
              isError: true
            };
          }

          const data = await accuWeatherClient.getWeatherForecast(lat, lon, days);

          // Format as clean JSON for Agent to analyze
          const forecast = data.forecast.map((day) => ({
            date: day.Date.split('T')[0],
            max_temp: day.Temperature.Maximum.Value,
            min_temp: day.Temperature.Minimum.Value,
            temp_unit: day.Temperature.Maximum.Unit,
            day_conditions: day.Day.IconPhrase,
            day_precipitation_probability: day.Day.PrecipitationProbability,
            night_conditions: day.Night.IconPhrase,
            night_precipitation_probability: day.Night.PrecipitationProbability,
            wind_speed: day.Day.Wind.Speed.Value,
            wind_unit: day.Day.Wind.Speed.Unit
          }));

          const response = {
            location: {
              latitude: lat,
              longitude: lon,
              name: data.location.LocalizedName,
              country: data.location.Country.LocalizedName,
              region: data.location.AdministrativeArea?.LocalizedName
            },
            current: {
              temperature: data.current.Temperature.Metric.Value,
              temp_unit: data.current.Temperature.Metric.Unit,
              conditions: data.current.WeatherText,
              humidity: data.current.RelativeHumidity,
              wind_speed: data.current.Wind.Speed.Metric.Value,
              wind_unit: data.current.Wind.Speed.Metric.Unit,
              wind_direction: data.current.Wind.Direction.Localized
            },
            period: {
              days: days,
              start_date: forecast[0].date,
              end_date: forecast[forecast.length - 1].date
            },
            forecast: forecast,
            data_source: 'AccuWeather API'
          };

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error: any) {
          console.error('[MCP Tool] Error in get_accuweather_weather_forecast:', error);
          return {
            content: [{
              type: 'text',
              text: `I'm having trouble getting weather data right now. ${error.message || 'Try again in a moment?'}`
            }],
            isError: true
          };
        }
      }
    );

    // Tool: Get Current Conditions
    server.tool(
      'get_accuweather_current_conditions',
      'Get current weather conditions from AccuWeather API. Returns temperature, conditions, humidity, wind, and precipitation.',
      {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.')
      },
      async ({ latitude, longitude }) => {
        try {
          const NAIROBI_LAT = -1.2864;
          const NAIROBI_LON = 36.8172;
          const lat = latitude ?? defaultLatitude ?? NAIROBI_LAT;
          const lon = longitude ?? defaultLongitude ?? NAIROBI_LON;

          console.log(`[MCP Tool] get_accuweather_current_conditions called: lat=${lat}, lon=${lon}`);

          if (!accuWeatherClient) {
            return {
              content: [{
                type: 'text',
                text: 'I\'m having trouble connecting to the weather data service. Try again in a moment?'
              }],
              isError: true
            };
          }

          const locationKey = await accuWeatherClient.getLocationKey(lat, lon);
          const current = await accuWeatherClient.getCurrentConditions(locationKey);

          const response = {
            location: {
              latitude: lat,
              longitude: lon
            },
            current: {
              temperature: current.Temperature.Metric.Value,
              temp_unit: current.Temperature.Metric.Unit,
              conditions: current.WeatherText,
              humidity: current.RelativeHumidity,
              wind_speed: current.Wind.Speed.Metric.Value,
              wind_unit: current.Wind.Speed.Metric.Unit,
              wind_direction: current.Wind.Direction.Localized,
              has_precipitation: current.HasPrecipitation,
              precipitation_type: current.PrecipitationType || 'none'
            },
            data_source: 'AccuWeather API'
          };

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }]
          };
        } catch (error: any) {
          console.error('[MCP Tool] Error in get_accuweather_current_conditions:', error);
          return {
            content: [{
              type: 'text',
              text: `I'm having trouble getting current weather conditions. ${error.message || 'Try again in a moment?'}`
            }],
            isError: true
          };
        }
      }
    );

    // Connect and handle the request
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

  } catch (error) {
    console.error('[MCP] Error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: null
    });
  }
});

// Start server
const HOST = '0.0.0.0';
const server = app.listen(Number(PORT), HOST, () => {
  console.log('');
  console.log('🚀 =========================================');
  console.log('   AccuWeather MCP Server');
  console.log('   Version 1.0.0');
  console.log('=========================================');
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌾 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`🔑 AccuWeather API Key: ${ACCUWEATHER_API_KEY ? '✅ Configured' : '⚠️  NOT CONFIGURED'}`);
  console.log(`🛠️  Tools: 2 (get_accuweather_weather_forecast, get_accuweather_current_conditions)`);
  console.log('=========================================');
  console.log('');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

