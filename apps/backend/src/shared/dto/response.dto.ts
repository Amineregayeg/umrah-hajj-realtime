export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
  path?: string;
}

export class ErrorResponseDto {
  success: false;
  error: string;
  message?: string;
  statusCode: number;
  timestamp: Date;
  path?: string;
  details?: any;
}

export class SuccessResponseDto<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: Date;
}