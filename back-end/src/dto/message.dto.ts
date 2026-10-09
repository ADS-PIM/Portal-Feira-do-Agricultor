import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { MessageSubject } from "../model/message";

export class MessageCreateDTO {// phone, subject, message
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
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