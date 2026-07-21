import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async getCoordsFromAddress(address: string) {
    try {
      const response: AxiosResponse<NominatimResponse[]> = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: address,
            format: 'json',
            limit: 1,
          },
          headers: {
            'User-Agent': 'KoudmainApp/1.0',
          },
        },
      );

      if (response && response.data && response.data.length > 0) {
        const first = response.data[0];
        return {
          latitude: parseFloat(first.lat),
          longitude: parseFloat(first.lon),
        };
      }
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erreur géocodage: ${errorMessage}`);
      return null;
    }
  }
}
