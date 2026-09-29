import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AdminRole } from '../model/admin';

export class AdminCreateDTO {
    @IsNotEmpty()
    @IsString()
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
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsEnum(AdminRole)
    role?: AdminRole;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsString()
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