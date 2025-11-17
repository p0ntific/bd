import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PostsModule } from "./posts/posts.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";

@Module({
    imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        PostsModule,
        SubscriptionsModule,
    ],
})
export class AppModule {}
