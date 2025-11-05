/**
 * AccuWeather API Client
 * 
 * AccuWeather API flow:
 * 1. Get location key from coordinates using /locations/v1/cities/geoposition/search
 * 2. Use location key for forecasts and current conditions
 */

import fetch, { Response } from 'node-fetch';

export interface AccuWeatherLocation {
  Key: string;
  LocalizedName: string;
  Country: {
    ID: string;
    LocalizedName: string;
  };
  AdministrativeArea: {
    ID: string;
    LocalizedName: string;
  };
}

export interface AccuWeatherForecast {
  Date: string;
  Temperature: {
    Minimum: { Value: number; Unit: string };
    Maximum: { Value: number; Unit: string };
  };
  Day: {
    Icon: number;
    IconPhrase: string;
    PrecipitationProbability: number;
    Wind: {
      Speed: { Value: number; Unit: string };
    };
  };
  Night: {
    Icon: number;
    IconPhrase: string;
    PrecipitationProbability: number;
  };
}

export interface AccuWeatherCurrentConditions {
  LocalObservationDateTime: string;
  Temperature: {
    Metric: { Value: number; Unit: string };
    Imperial: { Value: number; Unit: string };
  };
  WeatherText: string;
  WeatherIcon: number;
  RelativeHumidity: number;
  Wind: {
    Speed: { Metric: { Value: number; Unit: string } };
    Direction: { Degrees: number; Localized: string };
  };
  PrecipitationType?: string;
  HasPrecipitation: boolean;
}

/**
 * Client for interacting with AccuWeather API
 */
export class AccuWeatherClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://dataservice.accuweather.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Get location key from coordinates
   */
  async getLocationKey(lat: number, lon: number): Promise<string> {
    // Validate inputs
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${lat}`);
    }
    if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
      throw new Error(`Invalid longitude: ${lon}`);
    }

    const url = `${this.baseUrl}/locations/v1/cities/geoposition/search?apikey=${this.apiKey}&q=${lat},${lon}&language=en-us`;
    
    console.log(`[AccuWeather] Getting location key for (${lat}, ${lon})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AccuWeather-MCP-Server/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AccuWeather API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data: AccuWeatherLocation = await response.json() as AccuWeatherLocation;
      
      if (!data || !data.Key) {
        throw new Error('Invalid API response: missing location key');
      }

      console.log(`[AccuWeather] Location key: ${data.Key} (${data.LocalizedName}, ${data.Country.LocalizedName})`);
      return data.Key;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: AccuWeather API took too long to respond (30s limit)');
      }
      throw error;
    }
  }

  /**
   * Get current conditions
   */
  async getCurrentConditions(locationKey: string): Promise<AccuWeatherCurrentConditions> {
    if (!locationKey || typeof locationKey !== 'string') {
      throw new Error('Invalid location key');
    }

    const url = `${this.baseUrl}/currentconditions/v1/${locationKey}?apikey=${this.apiKey}&details=true&language=en-us`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AccuWeather-MCP-Server/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AccuWeather API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json() as AccuWeatherCurrentConditions[];
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid API response: missing current conditions');
      }

      return data[0];
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: AccuWeather API took too long to respond (30s limit)');
      }
      throw error;
    }
  }

  /**
   * Get daily forecast
   */
  async getForecast(locationKey: string, days: number = 5): Promise<AccuWeatherForecast[]> {
    if (!locationKey || typeof locationKey !== 'string') {
      throw new Error('Invalid location key');
    }
    if (typeof days !== 'number' || days < 1 || days > 15) {
      throw new Error(`Invalid number of days: ${days}. Must be between 1 and 15.`);
    }

    const url = `${this.baseUrl}/forecasts/v1/daily/${days}day/${locationKey}?apikey=${this.apiKey}&details=true&metric=true&language=en-us`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AccuWeather-MCP-Server/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AccuWeather API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json() as { DailyForecasts: AccuWeatherForecast[] };
      
      if (!data || !data.DailyForecasts || !Array.isArray(data.DailyForecasts)) {
        throw new Error('Invalid API response: missing daily forecasts');
      }

      return data.DailyForecasts.slice(0, days);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: AccuWeather API took too long to respond (30s limit)');
      }
      throw error;
    }
  }

  /**
   * Get weather forecast for coordinates
   */
  async getWeatherForecast(lat: number, lon: number, days: number = 5): Promise<{
    location: AccuWeatherLocation;
    current: AccuWeatherCurrentConditions;
    forecast: AccuWeatherForecast[];
  }> {
    const locationKey = await this.getLocationKey(lat, lon);
    const [current, forecast] = await Promise.all([
      this.getCurrentConditions(locationKey),
      this.getForecast(locationKey, days)
    ]);

    // Get location details from location key
    const locationUrl = `${this.baseUrl}/locations/v1/${locationKey}?apikey=${this.apiKey}&language=en-us`;
    const locationResponse = await fetch(locationUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AccuWeather-MCP-Server/1.0.0'
      }
    });
    
    if (!locationResponse.ok) {
      throw new Error(`Failed to get location details: ${locationResponse.status}`);
    }
    
    const location: AccuWeatherLocation = await locationResponse.json() as AccuWeatherLocation;

    return {
      location,
      current,
      forecast
    };
  }
}

