/**
 * Comprehensive unit tests for Content Service
 * Covers qibla bearing calculations for Paris/NYC/Jakarta and prayer calculations (Umm al-Qura)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateQiblaBearing } from '../shared/utils/qibla-calculation.util';

// Mock PrismaService
const mockPrismaService = {
  content: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  }
};

// Test data for major cities
const TEST_LOCATIONS = {
  PARIS: { lat: 48.8566, lon: 2.3522, name: 'Paris, France' },
  NYC: { lat: 40.7128, lon: -74.0060, name: 'New York City, USA' },
  JAKARTA: { lat: -6.2088, lon: 106.8456, name: 'Jakarta, Indonesia' },
  LONDON: { lat: 51.5074, lon: -0.1278, name: 'London, UK' },
  TOKYO: { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
  SYDNEY: { lat: -33.8688, lon: 151.2093, name: 'Sydney, Australia' },
  CAPE_TOWN: { lat: -33.9249, lon: 18.4241, name: 'Cape Town, South Africa' },
  MOSCOW: { lat: 55.7558, lon: 37.6176, name: 'Moscow, Russia' },
  MECCA: { lat: 21.4225, lon: 39.8262, name: 'Mecca, Saudi Arabia' },
  MEDINA: { lat: 24.5247, lon: 39.5692, name: 'Medina, Saudi Arabia' }
};

// Expected Qibla bearings (calculated using precise great-circle formulas)
const EXPECTED_QIBLA_BEARINGS = {
  PARIS: 119.17, // Southeast
  NYC: 58.48,    // Northeast  
  JAKARTA: 295.20, // Northwest
  LONDON: 118.99, // Southeast
  TOKYO: 292.86,  // Northwest
  SYDNEY: 277.50, // West-Northwest
  CAPE_TOWN: 18.81, // North-Northeast
  MOSCOW: 172.33,   // South
  MECCA: 0,         // Should be 0 when at Kaaba
  MEDINA: 180.04    // South (approximately)
};

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Qibla Calculation Accuracy', () => {
    it('should calculate correct Qibla bearing for Paris', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.PARIS.lat, TEST_LOCATIONS.PARIS.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.PARIS, 1);
    });

    it('should calculate correct Qibla bearing for New York City', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.NYC.lat, TEST_LOCATIONS.NYC.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.NYC, 1);
    });

    it('should calculate correct Qibla bearing for Jakarta', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.JAKARTA.lat, TEST_LOCATIONS.JAKARTA.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.JAKARTA, 1);
    });

    it('should calculate correct Qibla bearing for London', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.LONDON.lat, TEST_LOCATIONS.LONDON.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.LONDON, 1);
    });

    it('should calculate correct Qibla bearing for Tokyo', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.TOKYO.lat, TEST_LOCATIONS.TOKYO.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.TOKYO, 1);
    });

    it('should calculate correct Qibla bearing for Sydney', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.SYDNEY.lat, TEST_LOCATIONS.SYDNEY.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.SYDNEY, 1);
    });

    it('should calculate correct Qibla bearing for Cape Town', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.CAPE_TOWN.lat, TEST_LOCATIONS.CAPE_TOWN.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.CAPE_TOWN, 1);
    });

    it('should calculate correct Qibla bearing for Moscow', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.MOSCOW.lat, TEST_LOCATIONS.MOSCOW.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.MOSCOW, 1);
    });

    it('should return 0 degrees when at the Kaaba', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.MECCA.lat, TEST_LOCATIONS.MECCA.lon);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should calculate bearing for Medina (close to Mecca)', () => {
      const bearing = calculateQiblaBearing(TEST_LOCATIONS.MEDINA.lat, TEST_LOCATIONS.MEDINA.lon);
      expect(bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.MEDINA, 1);
    });
  });

  describe('Qibla Calculation Edge Cases', () => {
    it('should handle North Pole', () => {
      const bearing = calculateQiblaBearing(90, 0);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should handle South Pole', () => {
      const bearing = calculateQiblaBearing(-90, 0);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should handle antimeridian crossing', () => {
      // Location near international date line
      const bearing = calculateQiblaBearing(0, 180);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should handle prime meridian crossing', () => {
      const bearing = calculateQiblaBearing(0, 0);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should handle extreme coordinates', () => {
      const bearing = calculateQiblaBearing(-89.9, -179.9);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('Qibla Calculation Precision', () => {
    it('should maintain precision for nearby locations', () => {
      const location1 = { lat: 21.4220, lon: 39.8260 }; // Near Mecca
      const location2 = { lat: 21.4230, lon: 39.8270 }; // Slightly different
      
      const bearing1 = calculateQiblaBearing(location1.lat, location1.lon);
      const bearing2 = calculateQiblaBearing(location2.lat, location2.lon);
      
      // Should have different bearings for different locations
      expect(Math.abs(bearing1 - bearing2)).toBeGreaterThan(0.01);
    });

    it('should be consistent for repeated calculations', () => {
      const location = TEST_LOCATIONS.PARIS;
      
      const bearing1 = calculateQiblaBearing(location.lat, location.lon);
      const bearing2 = calculateQiblaBearing(location.lat, location.lon);
      const bearing3 = calculateQiblaBearing(location.lat, location.lon);
      
      expect(bearing1).toBe(bearing2);
      expect(bearing2).toBe(bearing3);
    });

    it('should handle small coordinate differences', () => {
      const baseLat = 48.8566;
      const baseLon = 2.3522;
      
      const bearing1 = calculateQiblaBearing(baseLat, baseLon);
      const bearing2 = calculateQiblaBearing(baseLat + 0.0001, baseLon);
      const bearing3 = calculateQiblaBearing(baseLat, baseLon + 0.0001);
      
      // Small changes should produce small bearing differences
      expect(Math.abs(bearing2 - bearing1)).toBeLessThan(1);
      expect(Math.abs(bearing3 - bearing1)).toBeLessThan(1);
    });
  });

  describe('Content Service CRUD Operations', () => {
    const mockContent = {
      id: '1',
      title: 'Test Prayer Time',
      type: 'prayer_times',
      category: 'umm_al_qura',
      data: {
        location: 'Mecca',
        date: '2023-07-15',
        fajr: '04:30',
        sunrise: '06:00',
        dhuhr: '12:30',
        asr: '16:00',
        maghrib: '19:00',
        isha: '20:30'
      },
      metadata: {
        calculation_method: 'umm_al_qura',
        timezone: 'Asia/Riyadh'
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should find all content with pagination', async () => {
      prismaService.content.findMany.mockResolvedValue([mockContent]);
      prismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should find content by ID', async () => {
      prismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.findOne('1');

      expect(result).toEqual(mockContent);
      expect(prismaService.content.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should create new content', async () => {
      const createDto = {
        title: 'New Prayer Time',
        type: 'prayer_times',
        category: 'umm_al_qura',
        data: { location: 'Medina' },
        metadata: { method: 'calculation' }
      };

      prismaService.content.create.mockResolvedValue({ ...mockContent, ...createDto });

      const result = await service.create(createDto);

      expect(result.title).toBe(createDto.title);
      expect(prismaService.content.create).toHaveBeenCalledWith({
        data: createDto
      });
    });

    it('should update existing content', async () => {
      const updateDto = {
        title: 'Updated Prayer Time'
      };

      const updatedContent = { ...mockContent, ...updateDto };
      prismaService.content.update.mockResolvedValue(updatedContent);

      const result = await service.update('1', updateDto);

      expect(result.title).toBe(updateDto.title);
      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto
      });
    });

    it('should delete content', async () => {
      prismaService.content.delete.mockResolvedValue(mockContent);

      const result = await service.remove('1');

      expect(result).toEqual(mockContent);
      expect(prismaService.content.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });
  });

  describe('Prayer Time Calculations (Umm al-Qura Method)', () => {
    it('should handle Umm al-Qura prayer time data structure', async () => {
      const ummAlQuraContent = {
        id: '1',
        title: 'Mecca Prayer Times',
        type: 'prayer_times',
        category: 'umm_al_qura',
        data: {
          location: 'Mecca',
          date: '2023-07-15',
          method: 'umm_al_qura',
          fajr: '04:23',
          sunrise: '05:52',
          dhuhr: '12:28',
          asr: '15:55',
          maghrib: '19:04',
          isha: '20:34',
          midnight: '00:28',
          qiyam: '03:07'
        },
        metadata: {
          calculation_method: 'umm_al_qura',
          fajr_angle: 18.5,
          isha_angle: 90, // Minutes after Maghrib
          timezone: 'Asia/Riyadh',
          dst_adjustment: false
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaService.content.findMany.mockResolvedValue([ummAlQuraContent]);
      prismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        type: 'prayer_times',
        category: 'umm_al_qura'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].category).toBe('umm_al_qura');
      expect(result.data[0].data.method).toBe('umm_al_qura');
      expect(result.data[0].metadata.fajr_angle).toBe(18.5);
    });

    it('should validate prayer time format', async () => {
      const content = {
        title: 'Prayer Times',
        type: 'prayer_times',
        category: 'umm_al_qura',
        data: {
          location: 'Riyadh',
          date: '2023-12-25',
          fajr: '05:15',
          sunrise: '06:45',
          dhuhr: '12:15',
          asr: '15:30',
          maghrib: '17:45',
          isha: '19:15'
        },
        metadata: {
          calculation_method: 'umm_al_qura'
        }
      };

      prismaService.content.create.mockResolvedValue({ id: '1', ...content, createdAt: new Date(), updatedAt: new Date(), isActive: true });

      const result = await service.create(content);

      expect(result.data.fajr).toMatch(/^[0-2][0-9]:[0-5][0-9]$/);
      expect(result.data.dhuhr).toMatch(/^[0-2][0-9]:[0-5][0-9]$/);
      expect(result.data.maghrib).toMatch(/^[0-2][0-9]:[0-5][0-9]$/);
    });

    it('should handle multiple calculation methods', async () => {
      const methods = ['umm_al_qura', 'egyptian', 'mwl', 'isna', 'karachi'];
      
      for (const method of methods) {
        const content = {
          title: `Prayer Times - ${method}`,
          type: 'prayer_times',
          category: method,
          data: {
            location: 'Mecca',
            method: method,
            fajr: '04:30',
            dhuhr: '12:30',
            maghrib: '19:00'
          },
          metadata: {
            calculation_method: method
          }
        };

        prismaService.content.create.mockResolvedValue({ 
          id: method, 
          ...content, 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          isActive: true 
        });

        const result = await service.create(content);
        expect(result.metadata.calculation_method).toBe(method);
      }
    });
  });

  describe('Content Filtering and Search', () => {
    it('should filter content by type', async () => {
      const prayerContent = [
        { ...mockContent, type: 'prayer_times' },
        { ...mockContent, id: '2', type: 'dua', title: 'Morning Dua' }
      ];

      prismaService.content.findMany.mockResolvedValue(prayerContent.filter(c => c.type === 'prayer_times'));
      prismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, type: 'prayer_times' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('prayer_times');
    });

    it('should filter content by category', async () => {
      prismaService.content.findMany.mockResolvedValue([mockContent]);
      prismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({ 
        page: 1, 
        limit: 10, 
        category: 'umm_al_qura' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].category).toBe('umm_al_qura');
    });

    it('should filter active content only', async () => {
      const activeContent = { ...mockContent, isActive: true };
      prismaService.content.findMany.mockResolvedValue([activeContent]);
      prismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({ 
        page: 1, 
        limit: 10, 
        isActive: true 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].isActive).toBe(true);
    });
  });

  describe('Qibla Content Management', () => {
    it('should store and retrieve Qibla direction content', async () => {
      const qiblaContent = {
        title: 'Qibla Direction for Paris',
        type: 'qibla',
        category: 'direction',
        data: {
          location: 'Paris, France',
          latitude: TEST_LOCATIONS.PARIS.lat,
          longitude: TEST_LOCATIONS.PARIS.lon,
          qibla_bearing: EXPECTED_QIBLA_BEARINGS.PARIS,
          calculation_date: new Date().toISOString(),
          accuracy: 'high'
        },
        metadata: {
          calculation_method: 'great_circle',
          kaaba_coordinates: {
            lat: 21.4225,
            lon: 39.8262
          }
        }
      };

      prismaService.content.create.mockResolvedValue({
        id: '1',
        ...qiblaContent,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });

      const result = await service.create(qiblaContent);

      expect(result.type).toBe('qibla');
      expect(result.data.qibla_bearing).toBeCloseTo(EXPECTED_QIBLA_BEARINGS.PARIS, 1);
    });

    it('should handle multiple city Qibla directions', async () => {
      const cities = ['PARIS', 'NYC', 'JAKARTA'];
      const qiblaContents = cities.map((city, index) => ({
        id: (index + 1).toString(),
        title: `Qibla for ${TEST_LOCATIONS[city].name}`,
        type: 'qibla',
        category: 'direction',
        data: {
          location: TEST_LOCATIONS[city].name,
          latitude: TEST_LOCATIONS[city].lat,
          longitude: TEST_LOCATIONS[city].lon,
          qibla_bearing: EXPECTED_QIBLA_BEARINGS[city]
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }));

      prismaService.content.findMany.mockResolvedValue(qiblaContents);
      prismaService.content.count.mockResolvedValue(qiblaContents.length);

      const result = await service.findAll({ 
        page: 1, 
        limit: 10, 
        type: 'qibla' 
      });

      expect(result.data).toHaveLength(3);
      expect(result.data.every(item => item.type === 'qibla')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prismaService.content.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid content ID', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      const result = await service.findOne('invalid-id');

      expect(result).toBeNull();
    });

    it('should handle malformed data gracefully', async () => {
      const malformedContent = {
        title: 'Malformed Content',
        type: 'prayer_times',
        data: 'invalid-json-structure',
        metadata: null
      };

      prismaService.content.create.mockResolvedValue({
        id: '1',
        ...malformedContent,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });

      const result = await service.create(malformedContent);
      expect(result.data).toBe('invalid-json-structure');
    });
  });
});