import {
  PluginRegistry,
  PluginNotFoundError,
  PluginTypeError,
} from '../../src/core/plugin-registry';
import { EmailProvider, DataExtractor, PortalAdapter } from '../../src/core/types';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a plugin', () => {
      const mockFactory = jest.fn(
        () =>
          ({ id: 'test', name: 'Test', version: '1.0.0', type: 'email-provider' }) as EmailProvider
      );

      registry.register({
        id: 'test-plugin',
        type: 'email-provider',
        factory: mockFactory,
      });

      expect(registry.has('test-plugin')).toBe(true);
    });

    it('should overwrite existing plugin with warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const factory1 = jest.fn(
        () =>
          ({
            id: 'test1',
            name: 'Test 1',
            version: '1.0.0',
            type: 'email-provider',
          }) as EmailProvider
      );
      const factory2 = jest.fn(
        () =>
          ({
            id: 'test2',
            name: 'Test 2',
            version: '1.0.0',
            type: 'email-provider',
          }) as EmailProvider
      );

      registry.register({ id: 'test', type: 'email-provider', factory: factory1 });
      registry.register({ id: 'test', type: 'email-provider', factory: factory2 });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already registered'));
      consoleSpy.mockRestore();
    });
  });

  describe('unregister', () => {
    it('should remove a registered plugin', () => {
      const factory = jest.fn(
        () =>
          ({ id: 'test', name: 'Test', version: '1.0.0', type: 'email-provider' }) as EmailProvider
      );

      registry.register({ id: 'test', type: 'email-provider', factory: factory });
      expect(registry.has('test')).toBe(true);

      registry.unregister('test');
      expect(registry.has('test')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return a plugin instance', () => {
      const mockPlugin = { id: 'test', name: 'Test', version: '1.0.0', type: 'email-provider' };
      const factory = jest.fn(() => mockPlugin as EmailProvider);

      registry.register({ id: 'test', type: 'email-provider', factory: factory });
      const instance = registry.get('test');

      expect(instance).toBe(mockPlugin);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should return existing instance on subsequent calls', () => {
      const factory = jest.fn(
        () =>
          ({ id: 'test', name: 'Test', version: '1.0.0', type: 'email-provider' }) as EmailProvider
      );

      registry.register({ id: 'test', type: 'email-provider', factory: factory });

      const instance1 = registry.get('test');
      const instance2 = registry.get('test');

      expect(instance1).toBe(instance2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should throw PluginNotFoundError for unregistered plugin', () => {
      expect(() => registry.get('nonexistent')).toThrow(PluginNotFoundError);
    });
  });

  describe('getEmailProvider', () => {
    it('should return email provider plugin', () => {
      const mockProvider = {
        id: 'outlook',
        name: 'Outlook',
        version: '1.0.0',
        type: 'email-provider' as const,
        authenticate: jest.fn(),
        isAuthenticated: jest.fn(),
        listEmails: jest.fn(),
        getEmail: jest.fn(),
        markAsRead: jest.fn(),
        moveToFolder: jest.fn(),
        getRawContent: jest.fn(),
      };

      registry.register({
        id: 'outlook',
        type: 'email-provider',
        factory: () => mockProvider as unknown as EmailProvider,
      });

      const provider = registry.getEmailProvider('outlook');
      expect(provider.id).toBe('outlook');
    });

    it('should throw PluginTypeError for wrong type', () => {
      const mockExtractor = {
        id: 'regex',
        name: 'Regex',
        version: '1.0.0',
        type: 'extractor' as const,
        extract: jest.fn(),
      };

      registry.register({
        id: 'regex',
        type: 'extractor',
        factory: () => mockExtractor as unknown as DataExtractor,
      });

      expect(() => registry.getEmailProvider('regex')).toThrow(PluginTypeError);
    });
  });

  describe('getExtractor', () => {
    it('should return data extractor plugin', () => {
      const mockExtractor = {
        id: 'regex',
        name: 'Regex',
        version: '1.0.0',
        type: 'extractor' as const,
        extract: jest.fn(),
      };

      registry.register({
        id: 'regex',
        type: 'extractor',
        factory: () => mockExtractor as unknown as DataExtractor,
      });

      const extractor = registry.getExtractor('regex');
      expect(extractor.id).toBe('regex');
    });
  });

  describe('getPortalAdapter', () => {
    it('should return portal adapter plugin', () => {
      const mockAdapter = {
        id: 'generic',
        name: 'Generic',
        version: '1.0.0',
        type: 'portal-adapter' as const,
        navigate: jest.fn(),
        authenticate: jest.fn(),
        isAuthenticated: jest.fn(),
        search: jest.fn(),
      };

      registry.register({
        id: 'generic',
        type: 'portal-adapter',
        factory: () => mockAdapter as unknown as PortalAdapter,
      });

      const adapter = registry.getPortalAdapter('generic');
      expect(adapter.id).toBe('generic');
    });
  });

  describe('list', () => {
    it('should return all registered plugins', () => {
      registry.register({
        id: 'plugin1',
        type: 'email-provider',
        factory: jest.fn(),
      });
      registry.register({
        id: 'plugin2',
        type: 'extractor',
        factory: jest.fn(),
      });

      const plugins = registry.list();
      expect(plugins).toHaveLength(2);
    });
  });

  describe('listByType', () => {
    it('should filter plugins by type', () => {
      registry.register({
        id: 'outlook',
        type: 'email-provider',
        factory: jest.fn(),
      });
      registry.register({
        id: 'gmail',
        type: 'email-provider',
        factory: jest.fn(),
      });
      registry.register({
        id: 'regex',
        type: 'extractor',
        factory: jest.fn(),
      });

      const emailProviders = registry.listByType('email-provider');
      expect(emailProviders).toHaveLength(2);
    });
  });

  describe('initializeAll', () => {
    it('should call initialize on all plugins', async () => {
      const mockInitialize = jest.fn();
      const plugin = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        type: 'extractor' as const,
        extract: jest.fn(),
        initialize: mockInitialize,
      };

      registry.register({
        id: 'test',
        type: 'extractor',
        factory: () => plugin as unknown as DataExtractor,
      });

      // Create instance
      registry.get('test');

      await registry.initializeAll();
      expect(mockInitialize).toHaveBeenCalled();
    });
  });

  describe('disposeAll', () => {
    it('should call dispose on all plugins', async () => {
      const mockDispose = jest.fn();
      const plugin = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        type: 'extractor' as const,
        extract: jest.fn(),
        dispose: mockDispose,
      };

      registry.register({
        id: 'test',
        type: 'extractor',
        factory: () => plugin as unknown as DataExtractor,
      });

      registry.get('test');

      await registry.disposeAll();
      expect(mockDispose).toHaveBeenCalled();
    });

    it('should clear instances after dispose', async () => {
      const plugin = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        type: 'extractor' as const,
        extract: jest.fn(),
      };

      registry.register({
        id: 'test',
        type: 'extractor',
        factory: () => plugin as unknown as DataExtractor,
      });

      registry.get('test');
      await registry.disposeAll();

      // Should create new instance
      const factory = jest.fn(() => plugin as unknown as DataExtractor);
      registry.register({ id: 'test', type: 'extractor', factory });
      registry.get('test');
      expect(factory).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all plugins', () => {
      registry.register({
        id: 'plugin1',
        type: 'email-provider',
        factory: jest.fn(),
      });
      registry.register({
        id: 'plugin2',
        type: 'extractor',
        factory: jest.fn(),
      });

      registry.clear();

      expect(registry.has('plugin1')).toBe(false);
      expect(registry.has('plugin2')).toBe(false);
      expect(registry.list()).toHaveLength(0);
    });
  });
});
