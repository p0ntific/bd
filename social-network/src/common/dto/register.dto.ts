import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterDto {
    @ApiProperty({ example: "user123", description: "Логин пользователя" })
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: "Логин может содержать только буквы, цифры и подчеркивания",
    })
    login: string;

    @ApiProperty({ example: "password123", description: "Пароль" })
    @IsString()
    @MinLength(6)
    @MaxLength(100)
    password: string;
}
