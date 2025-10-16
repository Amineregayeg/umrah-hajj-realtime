import { Location } from './location.interface';

export interface PilgrimageProgress {
  userId: string;
  type: PilgrimageType;
  status: PilgrimageStatus;
  startDate: Date;
  endDate?: Date;
  currentStep?: PilgrimageStep;
  completedSteps: PilgrimageStep[];
  location?: Location;
  groupId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PilgrimageType {
  UMRAH = 'UMRAH',
  HAJJ = 'HAJJ',
}

export enum PilgrimageStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface PilgrimageStep {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  type: PilgrimageType;
  order: number;
  location?: Location;
  estimatedDuration?: number; // in minutes
  isRequired: boolean;
  prerequisites?: string[];
  instructions?: StepInstruction[];
  media?: StepMedia[];
}

export interface StepInstruction {
  id: string;
  content: string;
  contentAr?: string;
  type: InstructionType;
  order: number;
  isRequired: boolean;
}

export enum InstructionType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  PRAYER = 'PRAYER',
  DUA = 'DUA',
  ACTION = 'ACTION',
}

export interface StepMedia {
  id: string;
  type: MediaType;
  url: string;
  title?: string;
  description?: string;
  language?: string;
  duration?: number; // for audio/video in seconds
}

export enum MediaType {
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export interface PilgrimageGroup {
  id: string;
  name: string;
  description?: string;
  type: PilgrimageType;
  leaderId: string;
  memberIds: string[];
  maxMembers?: number;
  status: GroupStatus;
  schedule?: GroupSchedule;
  meetingPoint?: Location;
  createdAt: Date;
  updatedAt: Date;
}

export enum GroupStatus {
  FORMING = 'FORMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DISBANDED = 'DISBANDED',
}

export interface GroupSchedule {
  events: GroupEvent[];
}

export interface GroupEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: Location;
  isRequired: boolean;
  attendeeIds?: string[];
}