import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
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
}