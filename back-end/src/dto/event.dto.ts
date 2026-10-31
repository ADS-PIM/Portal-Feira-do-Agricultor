import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsMilitaryTime, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { EventState } from '../model/event';
import type { EventImageSearchByEventId } from './eventImage.dto';

export class EventCreateDTO {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsDateString()
    date: Date;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsMilitaryTime()
    startAt: string;

    @IsNotEmpty()
    @IsMilitaryTime()
    endAt: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    localAddress: string;

    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number | null;

    @IsOptional()
    @IsEnum(EventState)
    state?: string

    @IsOptional()
    @IsString()
    bannerImage?: string | null;

    @IsNotEmpty()
    @IsString()
    adminId: string
}

export class EventUpdateDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    date?: Date;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    startAt: string;

    @IsOptional()
    @IsMilitaryTime()
    endAt: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    localAddress: string;

    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number | null;

    @IsOptional()   
    @IsEnum(EventState)
    state?: EventState

    @IsOptional()
    @IsString()
    bannerImage?: string | null;
}

export class EventSearchDTO {
    id: string;
    title: string;
    date: Date;
    startAt: string;
    endAt: string;
    description: string | null;
    localAddress: string;
    localLatitude: number | string | null;
    localLongitude: number | string | null;
    state: EventState;
    bannerImage: string | null;
    createdAt: Date;
}

export class AdminEventSearchDTO extends EventSearchDTO {
    administratorId: string;
    administratorName: string;
    administratorActive: boolean;
}

export class EventNearestSearchDTO {
    id: string;
    title: string;
    description: string | null;
    localAddress: string;
    date: Date;
    startAt: string;
    endAt: string;
    bannerImage: string | null;
}

export class EventAgendaSearchDTO {
    id: string;
    title: string;
    date: string;
    startAt: string;
    endAt: string;
    localAddress: string;
    state: EventState;
}

export class EventSearchByIdDTO {
    id: string;
    title: string;
    date: Date;
    description: string | null;
    startAt: string;
    endAt: string;
    localAddress: string;
    localLatitude: number | string | null;
    localLongitude: number | string | null;
    state: EventState;
    bannerImage: string | null;
    createdAt: Date;
    administratorId: string;
    eventImages: EventImageSearchByEventId[] | null;
}
