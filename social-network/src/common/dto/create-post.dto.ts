import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength } from "class-validator";

export class CreatePostDto {
    @ApiProperty({
        example: "Мой первый пост #welcome #hello",
        description: "Текст поста",
    })
    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    content: string;
}
