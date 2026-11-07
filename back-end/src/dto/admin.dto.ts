import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, IsBoolean, Matches, MaxLength, ValidateIf } from 'class-validator';
import { AdminRole } from '../model/admin';

export class AdminCreateDTO {
    @IsNotEmpty()
    @IsString()
    @Matches(/\S/)
    @MaxLength(255)
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
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
    createdAt: Date;
    profile_picture: string | null;
}

export class AdminSearchByIdDTO {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    active: boolean;
    profile_picture: string | null;
}
