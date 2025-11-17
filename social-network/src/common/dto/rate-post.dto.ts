import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class RatePostDto {
    @ApiProperty({
        description: "Значение оценки (1 - upvote, -1 - downvote)",
        enum: [1, -1],
        example: 1,
    })
    @IsIn([1, -1], { message: "Значение оценки должно быть 1 или -1" })
    value: number;
}
