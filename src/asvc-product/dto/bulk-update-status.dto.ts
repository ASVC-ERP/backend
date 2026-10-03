import { ArrayNotEmpty, IsArray, IsIn, IsInt } from 'class-validator';

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];

  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
