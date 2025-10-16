/**
 * MessagePack implementation for WebSocket binary frames using @msgpack/msgpack
 */
// TODO: Uncomment when @msgpack/msgpack is installed
// import { encode, decode } from '@msgpack/msgpack';

// Temporary mock implementation
const encode = (data: any): Uint8Array => {
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, 'utf8');
  const header = Buffer.from([0x82, 0x01]);
  return new Uint8Array(Buffer.concat([header, buffer]));
};

const decode = (buffer: Uint8Array | Buffer): any => {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 2 || buf[0] !== 0x82 || buf[1] !== 0x01) {
    throw new Error('Invalid MessagePack format');
  }
  const jsonBuffer = buf.slice(2);
  const jsonString = jsonBuffer.toString('utf8');
  return JSON.parse(jsonString);
};

export class MessagePackUtil {
  private static isEnabled: boolean | null = null;

  /**
   * Check if MessagePack is enabled via feature flag
   */
  static isMessagePackEnabled(): boolean {
    if (this.isEnabled === null) {
      this.isEnabled = process.env.WS_MSGPACK_ENABLED === 'true';
    }
    return this.isEnabled;
  }

  /**
   * Encode data to MessagePack binary format
   */
  static encode(data: any): Buffer {
    if (!this.isMessagePackEnabled()) {
      throw new Error('MessagePack is not enabled');
    }

    try {
      const encoded = encode(data);
      return Buffer.from(encoded);
    } catch (error) {
      throw new Error(`MessagePack encoding failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decode MessagePack binary data
   */
  static decode(buffer: Buffer): any {
    if (!this.isMessagePackEnabled()) {
      throw new Error('MessagePack is not enabled');
    }

    try {
      return decode(buffer);
    } catch (error) {
      throw new Error(`MessagePack decoding failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if data appears to be MessagePack format
   */
  static isMessagePackData(data: Buffer | string): boolean {
    if (!this.isMessagePackEnabled()) {
      return false;
    }

    if (Buffer.isBuffer(data)) {
      try {
        decode(data);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }

  /**
   * Determine content type based on feature flag and data
   */
  static getContentType(): string {
    return this.isMessagePackEnabled() ? 'application/x-msgpack' : 'application/json';
  }

  /**
   * Process incoming WebSocket message (auto-detect format)
   */
  static processIncomingMessage(data: Buffer | string): any {
    if (Buffer.isBuffer(data) && this.isMessagePackData(data)) {
      return this.decode(data);
    } else {
      // Assume JSON format
      const jsonString = Buffer.isBuffer(data) ? data.toString('utf8') : data;
      return JSON.parse(jsonString);
    }
  }

  /**
   * Prepare outgoing WebSocket message (use configured format)
   */
  static prepareOutgoingMessage(data: any): Buffer | string {
    if (this.isMessagePackEnabled()) {
      return this.encode(data);
    } else {
      return JSON.stringify(data);
    }
  }
}