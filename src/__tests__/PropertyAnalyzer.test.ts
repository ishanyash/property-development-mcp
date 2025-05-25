import { PropertyAnalyzer } from '../services/PropertyAnalyzer';
import { Logger, LogLevel } from '../utils/Logger';
import { CacheService } from '../services/CacheService';

// Mock axios to prevent actual HTTP requests during tests
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('PropertyAnalyzer', () => {
  let analyzer: PropertyAnalyzer;
  let logger: Logger;
  let cache: CacheService;

  beforeEach(() => {
    // Setup test dependencies
    logger = new Logger(LogLevel.DEBUG, 'test');
    cache = new CacheService(5, 100); // Short TTL and small cache for testing
    analyzer = new PropertyAnalyzer(logger, cache);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('extractPostcode', () => {
    test('should extract postcode from address', () => {
      const testCases = [
        {
          address: '123 Main Street, London, SW1A 1AA',
          expected: 'SW1A1AA'
        },
        {
          address: '45 High Road, Manchester, M1 4AB',
          expected: 'M14AB'
        },
        {
          address: 'Flat 2, Oak House, Birmingham B15 2TT',
          expected: 'B152TT'
        },
        {
          address: 'No postcode here',
          expected: ''
        }
      ];

      testCases.forEach(({ address, expected }) => {
        const result = (analyzer as any).extractPostcode(address);
        expect(result).toBe(expected);
      });
    });

    test('should handle postcode with spaces', () => {
      const address = '10 Example Street, London SW1A 1AA';
      const result = (analyzer as any).extractPostcode(address);
      expect(result).toBe('SW1A1AA');
    });
  });

  describe('parsePrice', () => {
    test('should parse various price formats', () => {
      const testCases = [
        { priceText: '£450,000', expected: 450000 },
        { priceText: '£1,250,000', expected: 1250000 },
        { priceText: '£75000', expected: 75000 },
        { priceText: '£2,500,000', expected: 2500000 },
        { priceText: 'Invalid price', expected: 0 },
        { priceText: '', expected: 0 }
      ];

      testCases.forEach(({ priceText, expected }) => {
        const result = (analyzer as any).parsePrice(priceText);
        expect(result).toBe(expected);
      });
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance between coordinates', () => {
      const coord1 = { lat: 51.5074, lng: -0.1278 }; // London
      const coord2 = { lat: 51.5074, lng: -0.1278 }; // Same location
      
      const distance = (analyzer as any).calculateDistance(coord1, coord2);
      expect(distance).toBe(0);
    });

    test('should calculate distance between different coordinates', () => {
      const london = { lat: 51.5074, lng: -0.1278 };
      const manchester = { lat: 53.4808, lng: -2.2426 };
      
      const distance = (analyzer as any).calculateDistance(london, manchester);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(300); // Should be around 260km
    });
  });

  describe('estimateFloorArea', () => {
    test('should estimate floor area for different property types', () => {
      const testCases = [
        {
          data: { propertyType: 'Terraced', bedrooms: 3, floorArea: undefined },
          expectedMin: 200, // 85 * 3 * 0.8
          expectedMax: 300
        },
        {
          data: { propertyType: 'Detached', bedrooms: 4, floorArea: undefined },
          expectedMin: 350, // 120 * 4 * 0.8
          expectedMax: 450
        },
        {
          data: { propertyType: 'Flat', bedrooms: 2, floorArea: undefined },
          expectedMin: 100, // 65 * 2 * 0.8
          expectedMax: 130
        }
      ];

      testCases.forEach(({ data, expectedMin, expectedMax }) => {
        const result = (analyzer as any).estimateFloorArea(data);
        expect(result).toBeGreaterThanOrEqual(expectedMin);
        expect(result).toBeLessThanOrEqual(expectedMax);
      });
    });

    test('should return existing floor area if provided', () => {
      const data = { floorArea: 150, propertyType: 'Terraced', bedrooms: 3 };
      const result = (analyzer as any).estimateFloorArea(data);
      expect(result).toBe(150);
    });
  });

  describe('getCoordinates', () => {
    test('should get coordinates for valid postcode', async () => {
      const mockResponse = {
        data: {
          result: {
            latitude: 51.5074,
            longitude: -0.1278
          }
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await (analyzer as any).getCoordinates('123 Main St, London SW1A 1AA');
      
      expect(result).toEqual({
        lat: 51.5074,
        lng: -0.1278
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.postcodes.io/postcodes/SW1A1AA',
        expect.any(Object)
      );
    });

    test('should use cached coordinates if available', async () => {
      const coordinates = { lat: 51.5074, lng: -0.1278 };
      cache.set('coords_SW1A1AA', coordinates);

      const result = await (analyzer as any).getCoordinates('123 Main St, London SW1A 1AA');
      
      expect(result).toEqual(coordinates);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    test('should throw error for invalid postcode', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Invalid postcode'));

      await expect(
        (analyzer as any).getCoordinates('Invalid address')
      ).rejects.toThrow('Could not geocode address');
    });
  });

  describe('determineTransportType', () => {
    test('should correctly identify transport types', () => {
      const testCases = [
        { name: 'King\'s Cross Underground Station', expected: 'Underground' },
        { name: 'London Bridge Station', expected: 'Rail' },
        { name: 'Oxford Circus Tube Station', expected: 'Underground' },
        { name: 'Bus Stop - High Street', expected: 'Bus' },
        { name: 'Manchester Tram Stop', expected: 'Tram' },
        { name: 'Generic Transport Hub', expected: 'Bus' }
      ];

      testCases.forEach(({ name, expected }) => {
        const result = (analyzer as any).determineTransportType(name);
        expect(result).toBe(expected);
      });
    });
  });

  describe('rateComparable', () => {
    test('should rate comparables based on recency and price', () => {
      const recentComparable = {
        saleDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        price: 500000
      };
      
      const oldComparable = {
        saleDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years ago
        price: 450000
      };
      
      const invalidComparable = {
        saleDate: new Date().toISOString(),
        price: 0
      };

      expect((analyzer as any).rateComparable(recentComparable)).toBe('High');
      expect((analyzer as any).rateComparable(oldComparable)).toBe('Low');
      expect((analyzer as any).rateComparable(invalidComparable)).toBe('Low');
    });
  });

  describe('generateMarketDataByArea', () => {
    test('should generate market data for different areas', () => {
      const testAreas = ['SW', 'W1', 'E1', 'SE', 'XX']; // XX is unknown area
      
      testAreas.forEach(area => {
        const result = (analyzer as any).generateMarketDataByArea(area);
        
        expect(result).toHaveProperty('averagePrice');
        expect(result).toHaveProperty('priceChange1Year');
        expect(result).toHaveProperty('priceChange5Year');
        expect(result).toHaveProperty('timeOnMarket');
        expect(result).toHaveProperty('demandLevel');
        expect(result).toHaveProperty('soldPriceAccuracy');
        expect(result).toHaveProperty('sampleSize');
        
        expect(result.averagePrice).toBeGreaterThan(0);
        expect(['High', 'Medium', 'Low']).toContain(result.demandLevel);
        expect(result.soldPriceAccuracy).toBeGreaterThan(0);
        expect(result.soldPriceAccuracy).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('assessDataQuality', () => {
    test('should assess data quality correctly', () => {
      const highQualityData = {
        comparables: [
          { rating: 'High', price: 500000 },
          { rating: 'High', price: 480000 },
          { rating: 'Medium', price: 520000 },
          { rating: 'Medium', price: 510000 },
          { rating: 'Low', price: 490000 }
        ],
        marketData: { sampleSize: 25 },
        planningHistory: [{ reference: 'P/2023/001' }]
      };

      const lowQualityData = {
        comparables: [{ rating: 'Low', price: 500000 }],
        marketData: { sampleSize: 5 },
        planningHistory: []
      };

      const highQualityResult = (analyzer as any).assessDataQuality(
        highQualityData.comparables,
        highQualityData.marketData,
        highQualityData.planningHistory
      );

      const lowQualityResult = (analyzer as any).assessDataQuality(
        lowQualityData.comparables,
        lowQualityData.marketData,
        lowQualityData.planningHistory
      );

      expect(highQualityResult.overallScore).toBeGreaterThan(lowQualityResult.overallScore);
      expect(highQualityResult.comparablesQuality).toBe('High');
      expect(lowQualityResult.comparablesQuality).toBe('Low');
      expect(highQualityResult.warnings.length).toBeLessThan(lowQualityResult.warnings.length);
    });
  });

  describe('analyze', () => {
    beforeEach(() => {
      // Mock the geocoding response
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('postcodes.io')) {
          return Promise.resolve({
            data: {
              result: {
                latitude: 51.5074,
                longitude: -0.1278,
                admin_district: 'Westminster'
              }
            }
          });
        }
        
        if (url.includes('rightmove.co.uk')) {
          return Promise.resolve({
            data: '<html><div class="propertyCard"><span class="propertyCard-priceValue">£450,000</span></div></html>'
          });
        }
        
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    test('should perform basic analysis', async () => {
      const result = await analyzer.analyze('123 Main St, London SW1A 1AA', 'basic');
      
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('coordinates');
      expect(result).toHaveProperty('analysisDate');
      expect(result).toHaveProperty('dataQuality');
      expect(result.dataQuality.overallScore).toBe(60);
      expect(result.planningHistory).toEqual([]);
      expect(result.comparables).toEqual([]);
    });

    test('should perform comprehensive analysis', async () => {
      const result = await analyzer.analyze('123 Main St, London SW1A 1AA', 'comprehensive');
      
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('coordinates');
      expect(result).toHaveProperty('currentValue');
      expect(result).toHaveProperty('propertyType');
      expect(result).toHaveProperty('planningHistory');
      expect(result).toHaveProperty('comparables');
      expect(result).toHaveProperty('marketTrends');
      expect(result).toHaveProperty('transportLinks');
      expect(result).toHaveProperty('localAmenities');
      expect(result).toHaveProperty('analysisDate');
      expect(result).toHaveProperty('dataQuality');
    });

    test('should handle analysis errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      await expect(
        analyzer.analyze('Invalid address', 'comprehensive')
      ).rejects.toThrow('Property analysis failed');
    });
  });

  describe('caching', () => {
    test('should cache and retrieve analysis results', async () => {
      const mockCoords = { lat: 51.5074, lng: -0.1278 };
      cache.set('coords_SW1A1AA', mockCoords);
      
      const cachedResult = cache.get('coords_SW1A1AA');
      expect(cachedResult).toEqual(mockCoords);
    });

    test('should handle cache misses', () => {
      const result = cache.get('nonexistent_key');
      expect(result).toBeNull();
    });
  });
});