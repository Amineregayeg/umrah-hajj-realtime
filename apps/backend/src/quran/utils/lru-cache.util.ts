/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used for caching Quran data to improve performance
 */

interface CacheNode<T> {
  key: string;
  value: T;
  prev?: CacheNode<T>;
  next?: CacheNode<T>;
}

export class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, CacheNode<T>>;
  private head?: CacheNode<T>;
  private tail?: CacheNode<T>;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.cache = new Map();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const node = this.cache.get(key);
    
    if (!node) {
      this.missCount++;
      return undefined;
    }

    this.hitCount++;
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Put value in cache
   */
  set(key: string, value: T): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      this.moveToHead(existingNode);
      return;
    }

    // Create new node
    const newNode: CacheNode<T> = { key, value };
    
    if (this.cache.size >= this.capacity) {
      // Remove least recently used node
      this.removeTail();
    }

    this.cache.set(key, newNode);
    this.addToHead(newNode);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove key from cache
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    
    if (!node) {
      return false;
    }

    this.cache.delete(key);
    this.removeNode(node);
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.head = undefined;
    this.tail = undefined;
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; hitRate: number; size: number; capacity: number } {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;

    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: Math.round(hitRate * 10000) / 100, // Round to 2 decimal places
      size: this.cache.size,
      capacity: this.capacity,
    };
  }

  /**
   * Get all keys in cache (from most to least recently used)
   */
  keys(): string[] {
    const keys: string[] = [];
    let current = this.head;
    
    while (current) {
      keys.push(current.key);
      current = current.next;
    }
    
    return keys;
  }

  private addToHead(node: CacheNode<T>): void {
    node.prev = undefined;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: CacheNode<T>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): void {
    if (!this.tail) {
      return;
    }

    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}