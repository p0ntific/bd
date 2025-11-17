import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "user123", description: "Логин пользователя" })
    @IsString()
    login: string;

    @ApiProperty({ example: "password123", description: "Пароль" })
    @IsString()
    password: string;
}
