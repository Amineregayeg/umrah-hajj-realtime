import { ContentType, ContentCategory } from './create-content.dto';

export class ContentResponseDto {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  category: ContentCategory;
  content?: string;
  mediaUrl?: string;
  language?: string;
  tags?: string[];
  isPublished: boolean;
  authorId?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ContentListResponseDto {
  items: ContentResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}