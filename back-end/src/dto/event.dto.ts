import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsMilitaryTime, IsNumber } from 'class-validator';
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
    localAddress: string;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsEnum(EventState)
    state?: string

    @IsOptional()
    @IsString()
    bannerImage?: string;

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
    localAddress: string;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()   
    @IsEnum(EventState)
    state?: EventState

    @IsOptional()
    @IsString()
    bannerImage?: string;
}

export class EventSearchDTO {
    id: string;
    title: string;
    date: Date;
    startAt: string;
    endAt: string;
    state: EventState;
    bannerImage: string | null;
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
}

export class EventSearchByIdDTO {
    id: string;
    title: string;
    date: Date;
    description: string | null;
    startAt: string;
    endAt: string;
    localAddress: string;
    localLatitude: number | string;
    localLongitude: number | string;
    state: EventState;
    bannerImage: string | null;
    createdAt: Date;
    administratorId: string;
    eventImages: EventImageSearchByEventId[] | null;
}
