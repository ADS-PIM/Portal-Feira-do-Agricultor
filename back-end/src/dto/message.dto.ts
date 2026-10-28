import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { MessageSubject } from "../model/message";

export class MessageCreateDTO {// phone, subject, message
    @IsNotEmpty()
    @IsString()
    name: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsNotEmpty()
    @IsEmail({}, { message: 'Informe um e-mail válido, como nome@exemplo.com.' })
    email: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value)
    @IsOptional()
    @IsString()
    @Matches(/^(?:\+55 ?)?(?:\([1-9]\d\)|[1-9]\d) ?(?:[2-5]\d{3}|9\d{4})-?\d{4}$/, {
        message: 'Informe um telefone com DDD, como (88) 99999-9999 ou (88) 3333-4444.'
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
