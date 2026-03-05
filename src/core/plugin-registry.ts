import { Plugin, EmailProvider, DataExtractor, PortalAdapter, PluginMetadata } from './types';

/**
 * Error thrown when a plugin is not found
 */
export class PluginNotFoundError extends Error {
  constructor(pluginId: string) {
    super(`Plugin '${pluginId}' not found. Did you register it?`);
    this.name = 'PluginNotFoundError';
  }
}

/**
 * Error thrown when a plugin type mismatch occurs
 */
export class PluginTypeError extends Error {
  constructor(expected: string, actual: string) {
    super(`Expected plugin of type '${expected}' but got '${actual}'`);
    this.name = 'PluginTypeError';
  }
}

/**
 * Registry for managing plugins
 */
export class PluginRegistry {
  private plugins: Map<string, PluginMetadata> = new Map();
  private instances: Map<string, Plugin> = new Map();

  /**
   * Register a plugin
   */
  register(metadata: PluginMetadata): void {
    if (this.plugins.has(metadata.id)) {
      console.warn(`Plugin '${metadata.id}' is already registered. Overwriting.`);
    }
    this.plugins.set(metadata.id, metadata);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.instances.delete(pluginId);
  }

  /**
   * Get a plugin instance (creates if needed)
   */
  get<T extends Plugin>(pluginId: string): T {
    // Return existing instance
    const existing = this.instances.get(pluginId);
    if (existing) {
      return existing as T;
    }

    // Create new instance
    const metadata = this.plugins.get(pluginId);
    if (!metadata) {
      throw new PluginNotFoundError(pluginId);
    }

    const instance = metadata.factory();
    this.instances.set(pluginId, instance);
    return instance as T;
  }

  /**
   * Get an email provider plugin
   */
  getEmailProvider(pluginId: string): EmailProvider {
    const plugin = this.get<EmailProvider>(pluginId);
    if (plugin.type !== 'email-provider') {
      throw new PluginTypeError('email-provider', plugin.type);
    }
    return plugin;
  }

  /**
   * Get a data extractor plugin
   */
  getExtractor(pluginId: string): DataExtractor {
    const plugin = this.get<DataExtractor>(pluginId);
    if (plugin.type !== 'extractor') {
      throw new PluginTypeError('extractor', plugin.type);
    }
    return plugin;
  }

  /**
   * Get a portal adapter plugin
   */
  getPortalAdapter(pluginId: string): PortalAdapter {
    const plugin = this.get<PortalAdapter>(pluginId);
    if (plugin.type !== 'portal-adapter') {
      throw new PluginTypeError('portal-adapter', plugin.type);
    }
    return plugin;
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * List all registered plugins
   */
  list(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * List plugins by type
   */
  listByType(type: 'email-provider' | 'extractor' | 'portal-adapter'): PluginMetadata[] {
    return this.list().filter(p => p.type === type);
  }

  /**
   * Initialize all plugins
   */
  async initializeAll(): Promise<void> {
    for (const [, plugin] of this.instances) {
      if (plugin.initialize) {
        await plugin.initialize();
      }
    }
  }

  /**
   * Dispose all plugins
   */
  async disposeAll(): Promise<void> {
    for (const [, plugin] of this.instances) {
      if (plugin.dispose) {
        await plugin.dispose();
      }
    }
    this.instances.clear();
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.plugins.clear();
    this.instances.clear();
  }
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = new PluginRegistry();
