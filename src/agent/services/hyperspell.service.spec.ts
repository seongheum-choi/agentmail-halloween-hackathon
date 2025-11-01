import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { HyperspellService } from './hyperspell.service';

jest.mock('hyperspell');

describe('HyperspellService', () => {
  let service: HyperspellService;
  let configService: ConfigService;

  const mockHyperspellInstance = {
    auth: {
      userToken: jest.fn(),
    },
    memories: {
      search: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const Hyperspell = require('hyperspell').default;
    Hyperspell.mockImplementation(() => mockHyperspellInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HyperspellService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'HYPERSPELL_API_KEY') {
                return 'hs-test-api-key';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HyperspellService>(HyperspellService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserToken', () => {
    it('should return user token successfully', async () => {
      const mockToken = 'test-user-token';
      mockHyperspellInstance.auth.userToken.mockResolvedValue({ token: mockToken });

      const result = await service.getUserToken('test-user');

      expect(result).toBe(mockToken);
      expect(mockHyperspellInstance.auth.userToken).toHaveBeenCalledWith({
        user_id: 'test-user',
      });
    });

    it('should use default userId when not provided', async () => {
      const mockToken = 'anonymous-token';
      mockHyperspellInstance.auth.userToken.mockResolvedValue({ token: mockToken });

      const result = await service.getUserToken();

      expect(result).toBe(mockToken);
      expect(mockHyperspellInstance.auth.userToken).toHaveBeenCalledWith({
        user_id: 'anonymous',
      });
    });

    it('should throw BadRequestException on error', async () => {
      mockHyperspellInstance.auth.userToken.mockRejectedValue(
        new Error('Invalid API key'),
      );

      await expect(service.getUserToken('test-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('search', () => {
    it('should search across all sources successfully', async () => {
      const mockAnswer = 'Search results here';
      mockHyperspellInstance.memories.search.mockResolvedValue({
        answer: mockAnswer,
      });

      const result = await service.search('test query', 'test-user', true);

      expect(result).toBe(mockAnswer);
      expect(mockHyperspellInstance.memories.search).toHaveBeenCalledWith({
        query: 'test query',
        answer: true,
        sources: [
          'google_mail',
          'slack',
          'google_drive',
          'notion',
          'github',
          'google_calendar',
          'google_docs',
        ],
      });
    });

    it('should use default parameters when not provided', async () => {
      const mockAnswer = 'Default search results';
      mockHyperspellInstance.memories.search.mockResolvedValue({
        answer: mockAnswer,
      });

      const result = await service.search('test query');

      expect(result).toBe(mockAnswer);
    });

    it('should throw BadRequestException on search error', async () => {
      mockHyperspellInstance.memories.search.mockRejectedValue(
        new Error('Search failed'),
      );

      await expect(service.search('test query')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('queryCalendar', () => {
    it('should query calendar successfully with answer and documents', async () => {
      const mockResponse = {
        answer: 'You have a meeting at 2pm tomorrow',
        documents: [
          {
            title: 'Team Meeting',
            content: 'Weekly team sync',
            source: 'google_calendar',
          },
        ],
      };
      mockHyperspellInstance.memories.search.mockResolvedValue(mockResponse);

      const result = await service.queryCalendar(
        'What meetings do I have tomorrow?',
        'test-user',
        true,
      );

      expect(result).toEqual({
        answer: mockResponse.answer,
        documents: mockResponse.documents,
      });
      expect(mockHyperspellInstance.memories.search).toHaveBeenCalledWith({
        query: 'What meetings do I have tomorrow?',
        answer: true,
        sources: ['google_calendar'],
      });
    });

    it('should use default parameters when not provided', async () => {
      const mockResponse = {
        answer: 'Your schedule for today',
        documents: [],
      };
      mockHyperspellInstance.memories.search.mockResolvedValue(mockResponse);

      const result = await service.queryCalendar('What is my schedule?');

      expect(result).toEqual({
        answer: mockResponse.answer,
        documents: [],
      });
    });

    it('should handle response without documents field', async () => {
      const mockResponse = {
        answer: 'No events found',
      };
      mockHyperspellInstance.memories.search.mockResolvedValue(mockResponse);

      const result = await service.queryCalendar('Check my calendar');

      expect(result).toEqual({
        answer: mockResponse.answer,
        documents: [],
      });
    });

    it('should throw BadRequestException on calendar query error', async () => {
      mockHyperspellInstance.memories.search.mockRejectedValue(
        new Error('Calendar not connected'),
      );

      await expect(
        service.queryCalendar('What is my schedule?'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only search google_calendar source', async () => {
      mockHyperspellInstance.memories.search.mockResolvedValue({
        answer: 'Calendar results',
        documents: [],
      });

      await service.queryCalendar('Check my schedule');

      const callArgs = mockHyperspellInstance.memories.search.mock.calls[0][0];
      expect(callArgs.sources).toEqual(['google_calendar']);
      expect(callArgs.sources).toHaveLength(1);
    });
  });

  describe('constructor', () => {
    it('should throw error when API key is not configured', () => {
      const mockConfigService = {
        get: jest.fn(() => undefined),
      };

      expect(() => {
        new HyperspellService(mockConfigService as any);
      }).toThrow('HYPERSPELL_API_KEY is not configured');
    });

    it('should throw error when API key is placeholder', () => {
      const mockConfigService = {
        get: jest.fn(() => 'hs-0-xxxxxxxxxxxxxxxxxxxxxx'),
      };

      expect(() => {
        new HyperspellService(mockConfigService as any);
      }).toThrow('HYPERSPELL_API_KEY is not configured');
    });
  });
});
