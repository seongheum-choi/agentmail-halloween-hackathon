import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { AnthropicService } from './services/anthropic.service';

describe('AgentService', () => {
  let service: AgentService;
  let anthropicService: AnthropicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: AnthropicService,
          useValue: {
            sendMessage: jest.fn(),
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
    anthropicService = module.get<AnthropicService>(AnthropicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should process chat request successfully', async () => {
      const mockResponse = 'Hello! How can I help you?';
      jest.spyOn(anthropicService, 'sendMessage').mockResolvedValue(mockResponse);

      const result = await service.chat({
        message: 'Hello',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('response', mockResponse);
      expect(result).toHaveProperty('timestamp');
    });
  });
});
