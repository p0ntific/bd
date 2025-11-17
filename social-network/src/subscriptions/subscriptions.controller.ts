import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SubscriptionsService } from "./subscriptions.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { User } from "../common/decorators/user.decorator";

@ApiTags("Подписки")
@Controller("subscriptions")
@UseGuards(AuthGuard)
export class SubscriptionsController {
    constructor(private subscriptionsService: SubscriptionsService) {}

    /**
     * Подписаться на пользователя
     */
    @Post(":userId")
    @ApiOperation({ summary: "Подписаться на пользователя" })
    @ApiResponse({ status: 201, description: "Подписка оформлена" })
    async subscribe(
        @User() user: any,
        @Param("userId", ParseIntPipe) userId: number
    ) {
        return this.subscriptionsService.subscribe(user.id, userId);
    }

    /**
     * Отписаться от пользователя
     */
    @Delete(":userId")
    @ApiOperation({ summary: "Отписаться от пользователя" })
    @ApiResponse({ status: 200, description: "Подписка отменена" })
    async unsubscribe(
        @User() user: any,
        @Param("userId", ParseIntPipe) userId: number
    ) {
        return this.subscriptionsService.unsubscribe(user.id, userId);
    }

    /**
     * Получить список подписок
     */
    @Get("my/subscriptions")
    @ApiOperation({ summary: "Получить список моих подписок" })
    @ApiResponse({ status: 200, description: "Список подписок" })
    async getMySubscriptions(@User() user: any) {
        return this.subscriptionsService.getSubscriptions(user.id);
    }

    /**
     * Получить список подписчиков
     */
    @Get("my/subscribers")
    @ApiOperation({ summary: "Получить список моих подписчиков" })
    @ApiResponse({ status: 200, description: "Список подписчиков" })
    async getMySubscribers(@User() user: any) {
        return this.subscriptionsService.getSubscribers(user.id);
    }

    /**
     * Получить список взаимных подписок
     */
    @Get("my/mutual")
    @ApiOperation({ summary: "Получить список взаимных подписок" })
    @ApiResponse({ status: 200, description: "Список взаимных подписок" })
    async getMutualSubscriptions(@User() user: any) {
        return this.subscriptionsService.getMutualSubscriptions(user.id);
    }
}
