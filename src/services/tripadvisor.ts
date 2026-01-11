import axios, { AxiosInstance } from 'axios';

export interface Attraction {
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  category: string;
  address?: string;
  priceLevel?: string;
  url?: string;
}

export interface Restaurant {
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  cuisine: string[];
  priceLevel?: string;
  address?: string;
  url?: string;
}

/**
 * TripAdvisor API Client
 * Provides attraction and restaurant information
 */
export class TripAdvisorClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TRIPADVISOR_API_KEY || '';
    
    this.client = axios.create({
      baseURL: 'https://api.content.tripadvisor.com/api/v1',
      headers: {
        'accept': 'application/json',
        'Referer': process.env.TRIPADVISOR_REFERER || 'http://localhost:3000',
      },
      timeout: 10000,
    });
  }

  /**
   * Search for attractions in a location
   */
  async searchAttractions(location: string, category?: string): Promise<Attraction[]> {
    if (!this.apiKey) {
      throw new Error('TripAdvisor API key is required. Please configure TRIPADVISOR_API_KEY environment variable.');
    }

    try {
      // First, search for location
      const locationId = await this.getLocationId(location);
      
      // Then get attractions
      const response = await this.client.get(`/location/${locationId}/attractions`, {
        params: {
          key: this.apiKey,
          language: 'en',
          category,
        },
      });

      return this.parseAttractions(response.data);
    } catch (error) {
      console.error('TripAdvisor API error:', error);
      throw new Error(`Failed to search attractions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for restaurants in a location
   */
  async searchRestaurants(location: string, cuisine?: string): Promise<Restaurant[]> {
    if (!this.apiKey) {
      throw new Error('TripAdvisor API key is required. Please configure TRIPADVISOR_API_KEY environment variable.');
    }

    try {
      const locationId = await this.getLocationId(location);
      
      const response = await this.client.get(`/location/${locationId}/restaurants`, {
        params: {
          key: this.apiKey,
          language: 'en',
        },
      });

      return this.parseRestaurants(response.data, cuisine);
    } catch (error) {
      console.error('TripAdvisor API error:', error);
      throw new Error(`Failed to search restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get details for a specific attraction or restaurant
   */
  async getDetails(locationId: string): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.client.get(`/location/${locationId}/details`, {
        params: {
          key: this.apiKey,
          language: 'en',
        },
      });

      return response.data;
    } catch (error) {
      console.error('TripAdvisor details API error:', error);
      return null;
    }
  }

  private async getLocationId(location: string): Promise<string> {
    try {
      const response = await this.client.get('/location/search', {
        params: {
          key: this.apiKey,
          searchQuery: location,
          language: 'en',
        },
      });

      return response.data.data?.[0]?.location_id || '';
    } catch (error) {
      return '';
    }
  }

  private parseAttractions(data: any): Attraction[] {
    const attractions: Attraction[] = [];
    
    if (data.data) {
      data.data.forEach((item: any) => {
        attractions.push({
          name: item.name,
          description: item.description || '',
          rating: item.rating || 0,
          reviewCount: item.num_reviews || 0,
          category: item.subcategory?.[0]?.name || 'Attraction',
          address: item.address_obj?.address_string,
          priceLevel: item.price_level,
          url: item.web_url,
        });
      });
    }

    return attractions;
  }

  private parseRestaurants(data: any, cuisine?: string): Restaurant[] {
    const restaurants: Restaurant[] = [];
    
    if (data.data) {
      data.data.forEach((item: any) => {
        const cuisines = item.cuisine?.map((c: any) => c.name) || [];
        
        if (!cuisine || cuisines.some((c: string) => c.toLowerCase().includes(cuisine.toLowerCase()))) {
          restaurants.push({
            name: item.name,
            description: item.description || '',
            rating: item.rating || 0,
            reviewCount: item.num_reviews || 0,
            cuisine: cuisines,
            priceLevel: item.price_level,
            address: item.address_obj?.address_string,
            url: item.web_url,
          });
        }
      });
    }

    return restaurants;
  }
}
