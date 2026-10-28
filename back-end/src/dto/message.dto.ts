import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
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
    @Matches(/^(?:[0-9]{10,11}|\([0-9]{2}\) [0-9]{4,5}-[0-9]{4})$/, {
        message: 'Informe um telefone com DDD e 10 ou 11 números, sem letras.',
    })
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
