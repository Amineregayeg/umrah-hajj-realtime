/**
 * Table-driven tests for content validation and retrieval
 * Tests content filtering, validation, and business logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from '../content.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { ContentQueryDto } from '../dto/content-query.dto';

describe('Content Validation Tests', () => {
  let service: ContentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    content: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Content Creation Validation', () => {
    const createContentCases = [
      {
        name: 'valid basic content',
        input: {
          title: 'Tawaf Guide',
          content: 'Step-by-step guide for performing Tawaf',
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'valid content with metadata',
        input: {
          title: 'Prayer Times',
          content: 'Current prayer times for Mecca',
          type: 'info',
          category: 'prayer',
          language: 'ar',
          isPublished: true,
          metadata: {
            location: 'Mecca',
            timezone: 'Asia/Riyadh',
            priority: 1,
          },
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'invalid title too short',
        input: {
          title: 'A',
          content: 'Valid content',
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'title',
      },
      {
        name: 'invalid title too long',
        input: {
          title: 'A'.repeat(256),
          content: 'Valid content',
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'title',
      },
      {
        name: 'empty content',
        input: {
          title: 'Valid Title',
          content: '',
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'content',
      },
      {
        name: 'invalid content type',
        input: {
          title: 'Valid Title',
          content: 'Valid content',
          type: 'invalid-type',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'type',
      },
      {
        name: 'invalid category',
        input: {
          title: 'Valid Title',
          content: 'Valid content',
          type: 'guide',
          category: 'invalid-category',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'category',
      },
      {
        name: 'invalid language code',
        input: {
          title: 'Valid Title',
          content: 'Valid content',
          type: 'guide',
          category: 'umrah',
          language: 'invalid',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'language',
      },
      {
        name: 'malicious script content',
        input: {
          title: 'Valid Title',
          content: '<script>alert("xss")</script>',
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'content',
      },
    ] as const;

    createContentCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.content.create.mockResolvedValue({
            id: 'test-id',
            ...testCase.input,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await service.create(testCase.input as CreateContentDto);
          expect(result).toBeDefined();
          expect(result.title).toBe(testCase.input.title);
          expect(mockPrismaService.content.create).toHaveBeenCalled();
        } else {
          await expect(service.create(testCase.input as CreateContentDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Content Query Validation', () => {
    const queryValidationCases = [
      {
        name: 'valid basic query',
        query: {
          page: 1,
          limit: 10,
          category: 'umrah',
          language: 'en',
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'valid query with search',
        query: {
          page: 1,
          limit: 20,
          search: 'tawaf guide',
          type: 'guide',
          isPublished: true,
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'invalid page number zero',
        query: {
          page: 0,
          limit: 10,
        },
        shouldSucceed: false,
        expectedError: 'page',
      },
      {
        name: 'invalid negative page',
        query: {
          page: -1,
          limit: 10,
        },
        shouldSucceed: false,
        expectedError: 'page',
      },
      {
        name: 'invalid limit too high',
        query: {
          page: 1,
          limit: 101,
        },
        shouldSucceed: false,
        expectedError: 'limit',
      },
      {
        name: 'invalid limit zero',
        query: {
          page: 1,
          limit: 0,
        },
        shouldSucceed: false,
        expectedError: 'limit',
      },
      {
        name: 'invalid search too short',
        query: {
          page: 1,
          limit: 10,
          search: 'a',
        },
        shouldSucceed: false,
        expectedError: 'search',
      },
      {
        name: 'invalid search with special characters',
        query: {
          page: 1,
          limit: 10,
          search: '<script>',
        },
        shouldSucceed: false,
        expectedError: 'search',
      },
    ] as const;

    queryValidationCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.content.findMany.mockResolvedValue([]);
          mockPrismaService.content.count.mockResolvedValue(0);

          const result = await service.findAll(testCase.query as ContentQueryDto);
          expect(result).toBeDefined();
          expect(result.data).toEqual([]);
          expect(mockPrismaService.content.findMany).toHaveBeenCalled();
        } else {
          await expect(service.findAll(testCase.query as ContentQueryDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Content Business Logic Validation', () => {
    const businessLogicCases = [
      {
        name: 'prayer content requires location metadata',
        content: {
          title: 'Prayer Times',
          content: 'Prayer schedule',
          type: 'info',
          category: 'prayer',
          language: 'en',
          isPublished: true,
          metadata: null,
        },
        shouldSucceed: false,
        expectedError: 'location metadata required for prayer content',
      },
      {
        name: 'guide content should have proper structure',
        content: {
          title: 'Tawaf Guide',
          content: 'Just tawaf',
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        },
        shouldSucceed: false,
        expectedError: 'guide content too short',
      },
      {
        name: 'emergency content must be immediately published',
        content: {
          title: 'Emergency Notice',
          content: 'Important emergency information for pilgrims',
          type: 'emergency',
          category: 'safety',
          language: 'en',
          isPublished: false,
        },
        shouldSucceed: false,
        expectedError: 'emergency content must be published',
      },
      {
        name: 'multilingual content validation',
        content: {
          title: 'دليل الطواف',
          content: 'خطوات أداء الطواف',
          type: 'guide',
          category: 'umrah',
          language: 'ar',
          isPublished: true,
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'content with invalid priority in metadata',
        content: {
          title: 'Valid Title',
          content: 'Valid content with sufficient length',
          type: 'info',
          category: 'umrah',
          language: 'en',
          isPublished: true,
          metadata: {
            priority: 100, // Invalid priority (should be 1-10)
          },
        },
        shouldSucceed: false,
        expectedError: 'priority',
      },
    ] as const;

    businessLogicCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.content.create.mockResolvedValue({
            id: 'test-id',
            ...testCase.content,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await service.create(testCase.content as CreateContentDto);
          expect(result).toBeDefined();
        } else {
          await expect(service.create(testCase.content as CreateContentDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Content Update Validation', () => {
    const updateCases = [
      {
        name: 'valid partial update',
        contentId: 'valid-id',
        updateData: {
          title: 'Updated Title',
          isPublished: false,
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'update with invalid title',
        contentId: 'valid-id',
        updateData: {
          title: '',
        },
        shouldSucceed: false,
        expectedError: 'title',
      },
      {
        name: 'update non-existent content',
        contentId: 'non-existent-id',
        updateData: {
          title: 'Valid Title',
        },
        shouldSucceed: false,
        expectedError: 'not found',
      },
      {
        name: 'update published emergency content',
        contentId: 'emergency-id',
        updateData: {
          isPublished: false,
        },
        shouldSucceed: false,
        expectedError: 'cannot unpublish emergency content',
      },
    ] as const;

    updateCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.content.findUnique.mockResolvedValue({
            id: testCase.contentId,
            title: 'Original Title',
            content: 'Original content',
            type: 'guide',
            category: 'umrah',
            language: 'en',
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          mockPrismaService.content.update.mockResolvedValue({
            id: testCase.contentId,
            ...testCase.updateData,
            updatedAt: new Date(),
          });

          const result = await service.update(testCase.contentId, testCase.updateData as UpdateContentDto);
          expect(result).toBeDefined();
        } else {
          if (testCase.contentId === 'non-existent-id') {
            mockPrismaService.content.findUnique.mockResolvedValue(null);
          } else if (testCase.contentId === 'emergency-id') {
            mockPrismaService.content.findUnique.mockResolvedValue({
              id: testCase.contentId,
              type: 'emergency',
              isPublished: true,
            });
          }

          await expect(service.update(testCase.contentId, testCase.updateData as UpdateContentDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Content Filtering and Search', () => {
    it('should filter content by category correctly', async () => {
      const mockContent = [
        { id: '1', category: 'umrah', title: 'Umrah Guide' },
        { id: '2', category: 'hajj', title: 'Hajj Guide' },
        { id: '3', category: 'umrah', title: 'Tawaf Steps' },
      ];

      mockPrismaService.content.findMany.mockResolvedValue(
        mockContent.filter(c => c.category === 'umrah')
      );
      mockPrismaService.content.count.mockResolvedValue(2);

      const result = await service.findAll({ category: 'umrah' } as ContentQueryDto);
      
      expect(result.data).toHaveLength(2);
      expect(result.data.every(item => item.category === 'umrah')).toBe(true);
    });

    it('should handle text search correctly', async () => {
      const mockContent = [
        { id: '1', title: 'Tawaf Guide', content: 'How to perform Tawaf' },
        { id: '2', title: 'Prayer Times', content: 'Current prayer schedule' },
      ];

      mockPrismaService.content.findMany.mockResolvedValue(
        mockContent.filter(c => 
          c.title.toLowerCase().includes('tawaf') || 
          c.content.toLowerCase().includes('tawaf')
        )
      );
      mockPrismaService.content.count.mockResolvedValue(1);

      const result = await service.findAll({ search: 'tawaf' } as ContentQueryDto);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toContain('Tawaf');
    });

    it('should paginate results correctly', async () => {
      const totalItems = 25;
      const pageSize = 10;
      const page = 2;

      mockPrismaService.content.findMany.mockResolvedValue(
        Array.from({ length: pageSize }, (_, i) => ({
          id: `item-${(page - 1) * pageSize + i + 1}`,
          title: `Item ${(page - 1) * pageSize + i + 1}`,
        }))
      );
      mockPrismaService.content.count.mockResolvedValue(totalItems);

      const result = await service.findAll({ 
        page, 
        limit: pageSize 
      } as ContentQueryDto);
      
      expect(result.data).toHaveLength(pageSize);
      expect(result.meta.total).toBe(totalItems);
      expect(result.meta.page).toBe(page);
      expect(result.meta.totalPages).toBe(Math.ceil(totalItems / pageSize));
    });
  });

  describe('Content Security and Sanitization', () => {
    const securityCases = [
      {
        name: 'HTML injection attempt',
        content: '<img src="x" onerror="alert(1)">',
        shouldBeSanitized: true,
      },
      {
        name: 'JavaScript injection',
        content: 'javascript:alert(document.cookie)',
        shouldBeSanitized: true,
      },
      {
        name: 'SQL injection attempt',
        content: "'; DROP TABLE content; --",
        shouldBeSanitized: true,
      },
      {
        name: 'Valid HTML content',
        content: '<p>This is <strong>valid</strong> content</p>',
        shouldBeSanitized: false,
      },
      {
        name: 'Arabic text content',
        content: 'هذا محتوى باللغة العربية',
        shouldBeSanitized: false,
      },
    ] as const;

    securityCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const createDto: CreateContentDto = {
          title: 'Test Content',
          content: testCase.content,
          type: 'guide',
          category: 'umrah',
          language: 'en',
          isPublished: true,
        };

        if (testCase.shouldBeSanitized) {
          await expect(service.create(createDto))
            .rejects
            .toThrow();
        } else {
          mockPrismaService.content.create.mockResolvedValue({
            id: 'test-id',
            ...createDto,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await service.create(createDto);
          expect(result).toBeDefined();
          expect(result.content).toBe(testCase.content);
        }
      });
    });
  });

  describe('Content Localization', () => {
    const localizationCases = [
      {
        language: 'en',
        title: 'English Title',
        content: 'English content',
        expectedDirection: 'ltr',
      },
      {
        language: 'ar',
        title: 'عنوان عربي',
        content: 'محتوى عربي',
        expectedDirection: 'rtl',
      },
      {
        language: 'ur',
        title: 'اردو عنوان',
        content: 'اردو مواد',
        expectedDirection: 'rtl',
      },
      {
        language: 'fr',
        title: 'Titre français',
        content: 'Contenu français',
        expectedDirection: 'ltr',
      },
    ] as const;

    localizationCases.forEach((testCase, index) => {
      it(`should handle ${testCase.language} content correctly (case ${index + 1})`, async () => {
        const createDto: CreateContentDto = {
          title: testCase.title,
          content: testCase.content,
          type: 'guide',
          category: 'umrah',
          language: testCase.language,
          isPublished: true,
        };

        mockPrismaService.content.create.mockResolvedValue({
          id: 'test-id',
          ...createDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await service.create(createDto);
        expect(result).toBeDefined();
        expect(result.language).toBe(testCase.language);
        expect(result.title).toBe(testCase.title);
        expect(result.content).toBe(testCase.content);
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});