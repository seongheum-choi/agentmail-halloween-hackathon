import { Test, TestingModule } from '@nestjs/testing';
import { ActionSelectorService } from './action-selector.service';
import { ChatGPTService } from '../../agent/services/chatgpt.service';
import { EmailAction, EmailContext } from '../types/action.types';

describe('ActionSelectorService', () => {
  let service: ActionSelectorService;
  let chatGPTService: ChatGPTService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionSelectorService,
        {
          provide: ChatGPTService,
          useValue: {
            sendMessageWithFormat: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ActionSelectorService>(ActionSelectorService);
    chatGPTService = module.get<ChatGPTService>(ChatGPTService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('selectAction', () => {
    it('should select OFFER action for email without time', async () => {
      const mockResponse = {
        action: 'OFFER',
        confidence: 0.95,
        reasoning: 'Email expresses interest without specific time',
      };

      jest.spyOn(chatGPTService, 'sendMessageWithFormat').mockResolvedValue(mockResponse);

      const result = await service.selectAction(
        'Dinner Reservation',
        'I would like to make a reservation for 4 people',
        EmailContext.INITIAL,
      );

      expect(result.action).toBe(EmailAction.OFFER);
      expect(result.confidence).toBe(0.95);
      expect(chatGPTService.sendMessageWithFormat).toHaveBeenCalled();
    });

    it('should select CHECK_TIME action for email with specific time', async () => {
      const mockResponse = {
        action: 'CHECK_TIME',
        confidence: 0.92,
        reasoning: 'Email contains specific time suggestion',
      };

      jest.spyOn(chatGPTService, 'sendMessageWithFormat').mockResolvedValue(mockResponse);

      const result = await service.selectAction(
        'Reservation Request',
        'I would like to book a table for 4 people this Friday at 7pm',
        EmailContext.INITIAL,
      );

      expect(result.action).toBe(EmailAction.CHECK_TIME);
      expect(result.confidence).toBe(0.92);
    });

    it('should select CONFIRM action for acceptance email', async () => {
      const mockResponse = {
        action: 'CONFIRM',
        confidence: 0.98,
        reasoning: 'Email confirms the reservation',
      };

      jest.spyOn(chatGPTService, 'sendMessageWithFormat').mockResolvedValue(mockResponse);

      const result = await service.selectAction(
        'Re: Reservation',
        'Yes, that time works perfectly for me!',
        EmailContext.INITIAL,
      );

      expect(result.action).toBe(EmailAction.CONFIRM);
      expect(result.confidence).toBe(0.98);
    });

    it('should select COUNTEROFFER action after CHECK_TIME', async () => {
      const mockResponse = {
        action: 'COUNTEROFFER',
        confidence: 0.90,
        reasoning: 'Sender suggests alternative time',
      };

      jest.spyOn(chatGPTService, 'sendMessageWithFormat').mockResolvedValue(mockResponse);

      const result = await service.selectAction(
        'Re: Reservation',
        '7pm does not work for me. Is 8pm available?',
        EmailContext.AFTER_CHECK_TIME,
      );

      expect(result.action).toBe(EmailAction.COUNTEROFFER);
      expect(result.confidence).toBe(0.90);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(chatGPTService, 'sendMessageWithFormat').mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.selectAction(
        'Test',
        'Test message',
        EmailContext.INITIAL,
      );

      expect(result.action).toBe(EmailAction.OFFER);
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('Error occurred');
    });
  });
});
