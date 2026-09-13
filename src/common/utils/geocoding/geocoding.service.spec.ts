import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingService } from './geocoding.service';
import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeocodingService],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);

    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('getCoordsFromAddress', () => {
    const addressSample = '10 Rue de la Paix, 75002 Paris';

    it('doit retourner les coordonnées de la première adresse trouvée', async () => {
      const mockNominatimResponse = [
        {
          lat: '48.869',
          lon: '2.331',
          display_name: 'Rue de la Paix, 75002 Paris, France',
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: mockNominatimResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: new AxiosHeaders(),
        } as InternalAxiosRequestConfig,
      });

      const result = await service.getCoordsFromAddress(addressSample);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith('https://nominatim.openstreetmap.org/search', {
        params: { q: addressSample, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'KoudmainApp/1.0' },
      });

      expect(result).toEqual({
        latitude: 48.869,
        longitude: 2.331,
      });
    });

    it('doit retourner null si Nominatim renvoie un tableau vide', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: new AxiosHeaders(),
        } as InternalAxiosRequestConfig,
      });

      const result = await service.getCoordsFromAddress('Adresse Introuvable Qui Nexiste Pas');

      expect(result).toBeNull();
    });

    it('doit retourner null et logger l’erreur si l’appel Axios échoue', async () => {
      const errorMessage = 'Network Error';

      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));
      const serviceWithLogger = service as unknown as {
        logger: { error: (message: string) => void };
      };

      const loggerSpy = jest.spyOn(serviceWithLogger.logger, 'error').mockImplementation();

      const result = await service.getCoordsFromAddress(addressSample);

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(`Erreur géocodage: ${errorMessage}`);
    });
  });
});
