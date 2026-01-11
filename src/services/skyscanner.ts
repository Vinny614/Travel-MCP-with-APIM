import axios, { AxiosInstance } from 'axios';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface FlightOffer {
  price: number;
  currency: string;
  airline: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  deepLink?: string;
}

/**
 * Skyscanner API Client
 * Provides flight search capabilities
 */
export class SkyscannerClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SKYSCANNER_API_KEY || '';
    
    this.client = axios.create({
      baseURL: 'https://partners.api.skyscanner.net',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Search for flights
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    if (!this.apiKey) {
      throw new Error('Skyscanner API key is required. Please configure SKYSCANNER_API_KEY environment variable.');
    }

    try {
      // Skyscanner API endpoint
      const response = await this.client.get('/apiservices/v3/flights/live/search/create', {
        params: {
          originPlace: params.origin,
          destinationPlace: params.destination,
          outboundDate: params.departDate,
          inboundDate: params.returnDate,
          adults: params.adults || 1,
          cabinClass: params.cabinClass || 'economy',
        },
      });

      return this.parseFlightResults(response.data);
    } catch (error) {
      console.error('Skyscanner API error:', error);
      throw new Error(`Failed to search flights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get place suggestions for autocomplete
   */
  async getPlaceSuggestions(query: string): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('Skyscanner API key is required. Please configure SKYSCANNER_API_KEY environment variable.');
    }

    try {
      const response = await this.client.get('/apiservices/v3/autosuggest/flights', {
        params: { query },
      });

      return response.data.places || [];
    } catch (error) {
      console.error('Skyscanner place suggestion error:', error);
      throw new Error(`Failed to get place suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseFlightResults(data: any): FlightOffer[] {
    // Parse Skyscanner response format
    const offers: FlightOffer[] = [];
    
    if (data.itineraries) {
      data.itineraries.slice(0, 10).forEach((itinerary: any) => {
        offers.push({
          price: itinerary.pricingOptions?.[0]?.price?.amount || 0,
          currency: itinerary.pricingOptions?.[0]?.price?.unit || 'USD',
          airline: itinerary.legs?.[0]?.carriers?.marketing?.[0]?.name || 'Unknown',
          departure: itinerary.legs?.[0]?.departure || '',
          arrival: itinerary.legs?.[0]?.arrival || '',
          duration: itinerary.legs?.[0]?.duration || '',
          stops: itinerary.legs?.[0]?.stopCount || 0,
          deepLink: itinerary.pricingOptions?.[0]?.deepLink,
        });
      });
    }

    return offers;
  }
}
