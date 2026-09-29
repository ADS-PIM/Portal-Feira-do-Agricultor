import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class EventImageCreateDTO {
    @IsNotEmpty()
    @IsString()
    imageURL: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsString()
    eventId: string
}

export class EventImageUpdateDTO {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    imageURL?: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class EventImageSearchByEventId {
    id: string;
    imageURL: string;
    description: string;
}