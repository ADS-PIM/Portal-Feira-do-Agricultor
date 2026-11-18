import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, IsBoolean, Matches, MaxLength, ValidateIf, ValidateBy } from 'class-validator';
import { isValidPassword, PASSWORD_REQUIREMENTS_MESSAGE } from '../util/passwordPolicy';
import { AdminRole } from '../model/admin';
import { isFullName, FULL_NAME_MESSAGE } from '../util/fullName';

export class AdminCreateDTO {
    @IsNotEmpty()
    @IsString()
    @Matches(/\S/)
    @MaxLength(255)
    @ValidateBy({ name: 'fullName', validator: { validate: isFullName, defaultMessage: () => FULL_NAME_MESSAGE } })
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @ValidateBy({ name: 'passwordPolicy', validator: { validate: isValidPassword, defaultMessage: () => PASSWORD_REQUIREMENTS_MESSAGE } })
    password: string;

    @IsNotEmpty()
    @IsEnum(AdminRole)
    role: AdminRole;
}

export class AdminLoginDTO {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class AdminUpdateDTO {
    @ValidateIf((_object, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    @Matches(/\S/)
    @MaxLength(255)
    name?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsEmail()
    email?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsNotEmpty()
    @IsString()
    @ValidateBy({ name: 'passwordPolicy', validator: { validate: isValidPassword, defaultMessage: () => PASSWORD_REQUIREMENTS_MESSAGE } })
    password?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsEnum(AdminRole)
    role?: AdminRole;

    @ValidateIf((_object, value) => value !== undefined)
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    profile_picture?: string | null;
}

export class AdminSearchDTO {//Não tem necessidade de validação pq vai ser usado so para pesquisa
    name: string;
    email: string;
    role: AdminRole;
    active: boolean;
    mustResetPassword: boolean;
    anonymizedAt: Date | null;
    createdAt: string;
    profile_picture: string | null;
}

export class AdminSearchByIdDTO {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    active: boolean;
    mustResetPassword: boolean;
    anonymizedAt: Date | null;
    profile_picture: string | null;
}
