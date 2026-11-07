import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { MessageSubject } from "../model/message";
import { IsContact } from './contact.validator';

export class MessageCreateDTO {
    @IsNotEmpty()
    @IsString()
    name: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value)
    @IsOptional()
    @IsContact('email')
    email?: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value)
    @IsOptional()
    @IsString()
    @IsContact('phone')
    phone?: string;

    @IsNotEmpty()
    @IsEnum(MessageSubject)
    subject: string;

    @IsNotEmpty()
    @IsString()
    message: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    title: string;
}

export class MessageSearchDTO {
    id: string;
    title: string;
    subject: string;
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
    submitDate: Date | null;
    isRead: boolean;
}
