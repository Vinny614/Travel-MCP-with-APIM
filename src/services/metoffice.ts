import axios, { AxiosInstance } from 'axios';

export interface WeatherForecast {
  date: string;
  location: string;
  temperature: {
    max: number;
    min: number;
    unit: string;
  };
  conditions: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

/**
 * Met Office API Client
 * Provides weather forecasting for UK and international locations
 */
export class MetOfficeClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MET_OFFICE_API_KEY || '';
    
    this.client = axios.create({
      baseURL: 'https://data.hub.api.metoffice.gov.uk/sitespecific/v0',
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Get weather forecast for a location
   */
  async getForecast(location: string, days: number = 5): Promise<WeatherForecast[]> {
    if (!this.apiKey) {
      throw new Error('Met Office API key is required. Please configure MET_OFFICE_API_KEY environment variable.');
    }

    try {
      // First, get location ID
      const locationData = await this.getLocationId(location);
      
      // Then get forecast
      const response = await this.client.get(`/point/${locationData.id}/forecast`, {
        params: {
          includeLocationName: true,
        },
      });

      return this.parseForecastData(response.data, days);
    } catch (error) {
      console.error('Met Office API error:', error);
      throw new Error(`Failed to get weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(location: string): Promise<WeatherForecast> {
    const forecasts = await this.getForecast(location, 1);
    return forecasts[0];
  }

  private async getLocationId(location: string): Promise<any> {
    // In a real implementation, you'd search for the location
    // For now, return mock location data
    return { id: '310042', name: location };
  }

  private parseForecastData(data: any, days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    
    if (data.features && data.features[0]?.properties?.timeSeries) {
      const timeSeries = data.features[0].properties.timeSeries;
      const dailyData = this.groupByDay(timeSeries).slice(0, days);
      
      dailyData.forEach((day: any) => {
        forecasts.push({
          date: day.date,
          location: data.features[0].properties.location?.name || 'Unknown',
          temperature: {
            max: Math.max(...day.temps),
            min: Math.min(...day.temps),
            unit: 'C',
          },
          conditions: day.conditions,
          precipitation: day.precipitation,
          windSpeed: day.windSpeed,
          humidity: day.humidity,
        });
      });
    }

    return forecasts;
  }

  private groupByDay(timeSeries: any[]): any[] {
    const days: any = {};
    
    timeSeries.forEach((item: any) => {
      const date = item.time?.split('T')[0];
      if (!days[date]) {
        days[date] = {
          date,
          temps: [],
          conditions: item.significantWeatherCode,
          precipitation: item.totalPrecipAmount || 0,
          windSpeed: item.windSpeed10m || 0,
          humidity: item.screenRelativeHumidity || 0,
        };
      }
      days[date].temps.push(item.screenTemperature || 0);
    });

    return Object.values(days);
  }
}
