/**
 * Basic tests for storage functionality
 */

import { storage } from '../storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('should save and load data correctly', () => {
    const testData = [
      { id: '1', name: 'Test Analysis', tenant_name: 'Test Tenant', proposals: [] },
      { id: '2', name: 'Another Analysis', tenant_name: 'Another Tenant', proposals: [] },
    ];

    storage.save(testData);
    const loaded = storage.load();

    expect(loaded).toEqual(testData);
    expect(loaded).toHaveLength(2);
  });

  test('should handle empty storage', () => {
    const loaded = storage.load();
    expect(loaded).toEqual([]);
  });

  test('should clear storage', () => {
    const testData = [{ id: '1', name: 'Test', tenant_name: 'Test Tenant', proposals: [] }];
    storage.save(testData);
    
    expect(storage.load()).toHaveLength(1);
    
    storage.clear();
    expect(storage.load()).toHaveLength(0);
  });

  test('should export and import data', () => {
    const testData = [
      { id: '1', name: 'Test Analysis', tenant_name: 'Test Tenant', proposals: [] },
    ];

    storage.save(testData);
    const exported = storage.export();
    
    // Clear storage
    storage.clear();
    expect(storage.load()).toHaveLength(0);

    // Import back
    const result = storage.import(exported);
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(storage.load()).toHaveLength(1);
  });

  test('should handle invalid import data', () => {
    const result = storage.import('invalid json');
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBeDefined();
  });
});
