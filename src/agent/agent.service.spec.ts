import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { ChatGPTService } from './services/chatgpt.service';
import { HyperspellService } from './services/hyperspell.service';

describe('AgentService', () => {
  let service: AgentService;
  let chatgptService: ChatGPTService;
  let hyperspellService: HyperspellService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: ChatGPTService,
          useValue: {
            sendMessage: jest.fn(),
          },
        },
        {
          provide: HyperspellService,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    chatgptService = module.get<ChatGPTService>(ChatGPTService);
    hyperspellService = module.get<HyperspellService>(HyperspellService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should process chat request successfully', async () => {
      const mockResponse = 'Hello! How can I help you?';
      jest.spyOn(chatgptService, 'sendMessage').mockResolvedValue(mockResponse);
      jest.spyOn(hyperspellService, 'search').mockResolvedValue(null);

      const result = await service.chat({
        message: 'Hello',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('response', mockResponse);
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle hyperspell errors gracefully', async () => {
      const mockResponse = 'Hello! How can I help you?';
      jest.spyOn(chatgptService, 'sendMessage').mockResolvedValue(mockResponse);
      jest.spyOn(hyperspellService, 'search').mockRejectedValue(new Error('Hyperspell error'));

      const result = await service.chat({
        message: 'Hello',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('response', mockResponse);
    });
  });
});
