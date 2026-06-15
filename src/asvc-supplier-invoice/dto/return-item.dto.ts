import { IsNumber, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemDto {
    @IsNumber()
    item_id: number;

    @IsNumber()
    qty: number;
}

export class ReturnDto {
    @IsString()
    reason: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReturnItemDto)
    items: ReturnItemDto[];
}