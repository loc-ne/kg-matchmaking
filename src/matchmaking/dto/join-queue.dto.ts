import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeControlDto {
    @IsString()
    @IsIn(['bullet', 'blitz', 'rapid', 'classical'])
    type: string;

    @IsNumber()
    initialTime: number;

    @IsNumber()
    increment: number;
}

export class JoinQueueDto {
  @ValidateNested()
  @Type(() => TimeControlDto)
  timeControl: TimeControlDto;

  @IsOptional()
  @IsString()
  guestName?: string;
}