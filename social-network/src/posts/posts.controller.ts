import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { PostsService } from "./posts.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { User } from "../common/decorators/user.decorator";
import { CreatePostDto } from "../common/dto/create-post.dto";
import { UpdatePostDto } from "../common/dto/update-post.dto";
import { RatePostDto } from "../common/dto/rate-post.dto";

@ApiTags("Посты")
@Controller("posts")
export class PostsController {
    constructor(private postsService: PostsService) {}

    /**
     * Создать новый пост
     */
    @Post()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Создать новый пост" })
    @ApiResponse({ status: 201, description: "Пост создан" })
    async createPost(@User() user: any, @Body() dto: CreatePostDto) {
        return this.postsService.createPost(user.id, dto.content);
    }

    /**
     * Получить свои посты
     */
    @Get("my")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Получить свои посты" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
    @ApiResponse({ status: 200, description: "Список постов" })
    async getMyPosts(
        @User() user: any,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query("order", new DefaultValuePipe("desc")) order: string
    ) {
        return this.postsService.getUserPosts(user.id, page, limit, order);
    }

    /**
     * Получить ленту постов из подписок
     */
    @Get("feed")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Получить ленту постов из подписок" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
    @ApiQuery({ name: "orderBy", required: false, enum: ["date", "rating"] })
    @ApiResponse({ status: 200, description: "Лента постов" })
    async getSubscriptionsFeed(
        @User() user: any,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query("order", new DefaultValuePipe("desc")) order: string,
        @Query("orderBy", new DefaultValuePipe("date")) orderBy: string
    ) {
        return this.postsService.getSubscriptionsFeed(
            user.id,
            page,
            limit,
            order,
            orderBy
        );
    }

    /**
     * Получить посты по хештегу
     */
    @Get("hashtag/:hashtag")
    @ApiOperation({ summary: "Получить посты по хештегу" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
    @ApiQuery({ name: "orderBy", required: false, enum: ["date", "rating"] })
    @ApiResponse({ status: 200, description: "Список постов с хештегом" })
    async getPostsByHashtag(
        @Param("hashtag") hashtag: string,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query("order", new DefaultValuePipe("desc")) order: string,
        @Query("orderBy", new DefaultValuePipe("date")) orderBy: string
    ) {
        return this.postsService.getPostsByHashtag(
            hashtag,
            page,
            limit,
            order,
            orderBy
        );
    }

    /**
     * Получить посты пользователя по логину
     */
    @Get("user/:login")
    @ApiOperation({ summary: "Получить посты пользователя по логину" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
    @ApiQuery({ name: "orderBy", required: false, enum: ["date", "rating"] })
    @ApiResponse({ status: 200, description: "Список постов пользователя" })
    async getUserPostsByLogin(
        @Param("login") login: string,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query("order", new DefaultValuePipe("desc")) order: string,
        @Query("orderBy", new DefaultValuePipe("date")) orderBy: string
    ) {
        return this.postsService.getUserPostsByLogin(
            login,
            page,
            limit,
            order,
            orderBy
        );
    }

    /**
     * Обновить пост
     */
    @Patch(":id")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Обновить пост" })
    @ApiResponse({ status: 200, description: "Пост обновлен" })
    async updatePost(
        @Param("id", ParseIntPipe) postId: number,
        @User() user: any,
        @Body() dto: UpdatePostDto
    ) {
        return this.postsService.updatePost(
            postId,
            user.id,
            user.role,
            dto.content
        );
    }

    /**
     * Удалить пост
     */
    @Delete(":id")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Удалить пост" })
    @ApiResponse({ status: 200, description: "Пост удален" })
    async deletePost(
        @Param("id", ParseIntPipe) postId: number,
        @User() user: any
    ) {
        return this.postsService.deletePost(postId, user.id, user.role);
    }

    /**
     * Поставить оценку посту
     */
    @Post(":id/rate")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Поставить оценку посту" })
    @ApiResponse({ status: 200, description: "Оценка сохранена" })
    async ratePost(
        @Param("id", ParseIntPipe) postId: number,
        @User() user: any,
        @Body() dto: RatePostDto
    ) {
        return this.postsService.ratePost(postId, user.id, dto.value);
    }

    /**
     * Отозвать оценку поста
     */
    @Delete(":id/rate")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Отозвать оценку поста" })
    @ApiResponse({ status: 200, description: "Оценка отозвана" })
    async removeRating(
        @Param("id", ParseIntPipe) postId: number,
        @User() user: any
    ) {
        return this.postsService.removeRating(postId, user.id);
    }
}
