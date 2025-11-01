import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentMailService } from './agentmail.service';

jest.mock('agentmail');

describe('AgentMailService', () => {
  let service: AgentMailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentMailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    mockConfigService.get.mockReturnValue('test-api-key');
    service = module.get<AgentMailService>(AgentMailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if AGENTMAIL_API_KEY is not configured', () => {
    mockConfigService.get.mockReturnValue(undefined);
    expect(() => {
      new AgentMailService(configService);
    }).toThrow('AGENTMAIL_API_KEY is not configured');
  });

  describe('listInboxes', () => {
    it('should call client.inboxes.list', async () => {
      const mockInboxes = [{ id: '1', name: 'Inbox 1' }];
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const inbox of mockInboxes) {
            yield inbox;
          }
        },
      };

      jest
        .spyOn(service['client'].inboxes, 'list')
        .mockResolvedValue(mockAsyncIterator as any);

      const result = await service.listInboxes();
      expect(result).toEqual(mockInboxes);
    });
  });

  describe('listThreads', () => {
    it('should call client.threads.list with params', async () => {
      const mockThreads = [{ id: '1', subject: 'Test Thread' }];
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const thread of mockThreads) {
            yield thread;
          }
        },
      };

      const params = { limit: 10, ascending: true };
      jest
        .spyOn(service['client'].threads, 'list')
        .mockResolvedValue(mockAsyncIterator as any);

      const result = await service.listThreads(params);
      expect(result).toEqual(mockThreads);
    });
  });

  describe('getThread', () => {
    it('should call client.threads.get with threadId', async () => {
      const mockThread = { id: '123', subject: 'Test Thread' };
      jest
        .spyOn(service['client'].threads, 'get')
        .mockResolvedValue(mockThread as any);

      const result = await service.getThread('123');
      expect(result).toEqual(mockThread);
      expect(service['client'].threads.get).toHaveBeenCalledWith('123');
    });
  });

  describe('getThreadAttachment', () => {
    it('should call client.threads.getAttachment with threadId and attachmentId', async () => {
      const mockAttachment = Buffer.from('test attachment data');
      jest
        .spyOn(service['client'].threads, 'getAttachment')
        .mockResolvedValue(mockAttachment as any);

      const result = await service.getThreadAttachment('123', 'att-456');
      expect(result).toEqual(mockAttachment);
      expect(service['client'].threads.getAttachment).toHaveBeenCalledWith(
        '123',
        'att-456',
      );
    });
  });
});
