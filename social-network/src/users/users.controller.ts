import {
    Controller,
    Delete,
    Patch,
    Get,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { User } from "../common/decorators/user.decorator";

@ApiTags("Пользователи")
@Controller("users")
export class UsersController {
    constructor(private usersService: UsersService) {}

    /**
     * Удалить свой аккаунт
     */
    @Delete("me")
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: "Удалить свой аккаунт" })
    @ApiQuery({ name: "deletePosts", required: false, type: Boolean })
    @ApiResponse({ status: 200, description: "Аккаунт удален" })
    async deleteMyAccount(
        @User() user: any,
        @Query("deletePosts") deletePosts: string
    ) {
        return this.usersService.deleteAccount(
            user.id,
            user.id,
            user.role,
            deletePosts === "true"
        );
    }

    /**
     * Удалить аккаунт пользователя (модератор/админ)
     */
    @Delete(":id")
    @UseGuards(AuthGuard, RolesGuard)
    @Roles("moderator", "admin")
    @ApiOperation({ summary: "Удалить аккаунт пользователя" })
    @ApiQuery({ name: "deletePosts", required: false, type: Boolean })
    @ApiResponse({ status: 200, description: "Аккаунт удален" })
    async deleteUser(
        @Param("id", ParseIntPipe) userId: number,
        @User() user: any,
        @Query("deletePosts") deletePosts: string
    ) {
        return this.usersService.deleteAccount(
            userId,
            user.id,
            user.role,
            deletePosts === "true"
        );
    }

    /**
     * Изменить роль пользователя (только админ)
     */
    @Patch(":id/role")
    @UseGuards(AuthGuard, RolesGuard)
    @Roles("admin")
    @ApiOperation({ summary: "Изменить роль пользователя" })
    @ApiResponse({ status: 200, description: "Роль изменена" })
    async changeRole(
        @Param("id", ParseIntPipe) userId: number,
        @Body("role") newRole: string,
        @User() user: any
    ) {
        return this.usersService.changeUserRole(userId, newRole, user.id);
    }

    /**
     * Получить информацию о пользователе по логину
     */
    @Get("by-login/:login")
    @ApiOperation({ summary: "Получить информацию о пользователе по логину" })
    @ApiResponse({ status: 200, description: "Информация о пользователе" })
    async getUserByLogin(@Param("login") login: string) {
        return this.usersService.getUserByLogin(login);
    }

    /**
     * Получить список пользователей с рейтингом
     */
    @Get("rating")
    @ApiOperation({ summary: "Получить список пользователей с рейтингом" })
    @ApiQuery({ name: "orderBy", required: false, enum: ["total", "average"] })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: "Список пользователей с рейтингом",
    })
    async getUsersWithRating(
        @Query("orderBy", new DefaultValuePipe("total")) orderBy: string,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number
    ) {
        return this.usersService.getUsersWithRating(orderBy, page, limit);
    }
}
