import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../utils/lru-cache.util';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3); // Small cache for testing
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      
      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should update existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      
      expect(cache.get('key1')).toBe('value2');
      expect(cache.size()).toBe(1);
    });
  });

  describe('capacity management', () => {
    it('should respect capacity limits', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      expect(cache.size()).toBe(3);
      
      // Adding fourth item should evict the least recently used
      cache.set('key4', 'value4');
      
      expect(cache.size()).toBe(3);
      expect(cache.has('key1')).toBe(false); // Should be evicted
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle capacity of 1', () => {
      const smallCache = new LRUCache<string>(1);
      
      smallCache.set('key1', 'value1');
      expect(smallCache.size()).toBe(1);
      
      smallCache.set('key2', 'value2');
      expect(smallCache.size()).toBe(1);
      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key2')).toBe(true);
    });

    it('should handle zero or negative capacity by using minimum capacity of 1', () => {
      const zeroCache = new LRUCache<string>(0);
      const negativeCache = new LRUCache<string>(-5);
      
      zeroCache.set('key1', 'value1');
      negativeCache.set('key1', 'value1');
      
      expect(zeroCache.size()).toBe(1);
      expect(negativeCache.size()).toBe(1);
    });
  });

  describe('LRU behavior', () => {
    it('should move accessed items to front', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Add key4, key2 should be evicted (least recently used)
      cache.set('key4', 'value4');
      
      expect(cache.has('key1')).toBe(true); // Should still be there
      expect(cache.has('key2')).toBe(false); // Should be evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update position when setting existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Update key1 to make it most recently used
      cache.set('key1', 'updated_value1');
      
      // Add key4, key2 should be evicted (least recently used)
      cache.set('key4', 'value4');
      
      expect(cache.get('key1')).toBe('updated_value1'); // Should still be there
      expect(cache.has('key2')).toBe(false); // Should be evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should maintain correct order in keys()', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Most recent first
      expect(cache.keys()).toEqual(['key3', 'key2', 'key1']);
      
      // Access key1 to make it most recent
      cache.get('key1');
      expect(cache.keys()).toEqual(['key1', 'key3', 'key2']);
    });
  });

  describe('statistics and monitoring', () => {
    it('should track hit and miss statistics', () => {
      cache.set('key1', 'value1');
      
      // Hit
      cache.get('key1');
      
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.size).toBe(1);
      expect(stats.capacity).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');
      
      // 3 hits
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');
      
      // 1 miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75);
    });

    it('should handle zero operations gracefully', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.capacity).toBe(3);
    });
  });

  describe('clear operation', () => {
    it('should clear all entries and reset statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('nonexistent');
      
      expect(cache.size()).toBe(2);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.keys()).toEqual([]);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle complex object values', () => {
      const complexCache = new LRUCache<{ id: number; data: string[] }>(2);
      
      const obj1 = { id: 1, data: ['a', 'b', 'c'] };
      const obj2 = { id: 2, data: ['x', 'y', 'z'] };
      
      complexCache.set('obj1', obj1);
      complexCache.set('obj2', obj2);
      
      expect(complexCache.get('obj1')).toEqual(obj1);
      expect(complexCache.get('obj2')).toEqual(obj2);
    });

    it('should handle null and undefined values', () => {
      cache.set('null', null as any);
      cache.set('undefined', undefined as any);
      
      expect(cache.get('null')).toBeNull();
      expect(cache.get('undefined')).toBeUndefined();
      expect(cache.has('null')).toBe(true);
      expect(cache.has('undefined')).toBe(true);
    });

    it('should handle empty string keys and values', () => {
      cache.set('', 'empty key');
      cache.set('empty value', '');
      
      expect(cache.get('')).toBe('empty key');
      expect(cache.get('empty value')).toBe('');
      expect(cache.has('')).toBe(true);
      expect(cache.has('empty value')).toBe(true);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large number of operations efficiently', () => {
      const largeCache = new LRUCache<number>(1000);
      
      // Fill cache
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key${i}`, i);
      }
      
      expect(largeCache.size()).toBe(1000);
      
      // Add more items to trigger eviction
      for (let i = 1000; i < 1100; i++) {
        largeCache.set(`key${i}`, i);
      }
      
      expect(largeCache.size()).toBe(1000);
      
      // First 100 items should be evicted
      for (let i = 0; i < 100; i++) {
        expect(largeCache.has(`key${i}`)).toBe(false);
      }
      
      // Last 1000 items should still be present
      for (let i = 100; i < 1100; i++) {
        expect(largeCache.has(`key${i}`)).toBe(true);
      }
    });
  });
});