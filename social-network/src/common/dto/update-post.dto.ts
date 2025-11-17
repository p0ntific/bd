import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength } from "class-validator";

export class UpdatePostDto {
    @ApiProperty({
        example: "Обновленный текст поста #updated",
        description: "Новый текст поста",
    })
    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    content: string;
}
