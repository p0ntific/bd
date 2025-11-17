import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    const config = new DocumentBuilder()
        .setTitle("Social Network API")
        .setDescription("API социальной сети с постами, хештегами и подписками")
        .setVersion("1.0")
        .addCookieAuth("userId")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`Приложение запущено на http://localhost:${port}`);
    console.log(`Swagger документация: http://localhost:${port}/api`);
}

bootstrap();
