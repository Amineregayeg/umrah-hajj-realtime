import { Gender } from './create-profile.dto';

export class ProfileResponseDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phoneNumber?: string;
  nationality?: string;
  preferredLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
}