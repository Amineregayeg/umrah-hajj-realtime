export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export enum WebSocketMessageType {
  // Navigation events
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  NAVIGATION_START = 'NAVIGATION_START',
  NAVIGATION_END = 'NAVIGATION_END',
  NAVIGATION_UPDATE = 'NAVIGATION_UPDATE',
  
  // Prayer events
  PRAYER_TIME_UPDATE = 'PRAYER_TIME_UPDATE',
  PRAYER_REMINDER = 'PRAYER_REMINDER',
  
  // Pilgrimage events
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_STARTED = 'STEP_STARTED',
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
  
  // Group events
  GROUP_MESSAGE = 'GROUP_MESSAGE',
  GROUP_UPDATE = 'GROUP_UPDATE',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  
  // Emergency events
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  SAFETY_UPDATE = 'SAFETY_UPDATE',
  
  // AI events
  AI_RESPONSE = 'AI_RESPONSE',
  AI_SUGGESTION = 'AI_SUGGESTION',
  
  // System events
  CONNECTION_ACK = 'CONNECTION_ACK',
  HEARTBEAT = 'HEARTBEAT',
  ERROR = 'ERROR',
  DISCONNECT = 'DISCONNECT',
}

export interface LocationUpdateMessage {
  type: WebSocketMessageType.LOCATION_UPDATE;
  data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: Date;
  };
}

export interface NavigationMessage {
  type: WebSocketMessageType.NAVIGATION_START | WebSocketMessageType.NAVIGATION_END | WebSocketMessageType.NAVIGATION_UPDATE;
  data: {
    destination?: {
      name: string;
      latitude: number;
      longitude: number;
    };
    route?: {
      steps: NavigationStep[];
      distance: number;
      estimatedTime: number;
    };
    currentStep?: NavigationStep;
  };
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface PrayerTimeMessage {
  type: WebSocketMessageType.PRAYER_TIME_UPDATE | WebSocketMessageType.PRAYER_REMINDER;
  data: {
    prayer: string;
    time: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
    timeRemaining?: number; // minutes until prayer time
  };
}

export interface ProgressUpdateMessage {
  type: WebSocketMessageType.STEP_COMPLETED | WebSocketMessageType.STEP_STARTED | WebSocketMessageType.PROGRESS_UPDATE;
  data: {
    stepId: string;
    stepName: string;
    progress: number; // percentage 0-100
    location?: {
      latitude: number;
      longitude: number;
    };
    timestamp: Date;
  };
}

export interface GroupMessage {
  type: WebSocketMessageType.GROUP_MESSAGE | WebSocketMessageType.GROUP_UPDATE;
  data: {
    groupId: string;
    senderId?: string;
    message?: string;
    update?: any;
    timestamp: Date;
  };
}

export interface EmergencyMessage {
  type: WebSocketMessageType.EMERGENCY_ALERT | WebSocketMessageType.SAFETY_UPDATE;
  data: {
    alertType: 'EMERGENCY' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    location?: {
      latitude: number;
      longitude: number;
      radius?: number; // affected area in meters
    };
    actionRequired?: boolean;
    expiresAt?: Date;
  };
}