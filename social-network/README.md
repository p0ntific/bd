# Social Network API

API социальной сети с постами, хештегами и подписками, построенное на NestJS и PostgreSQL.

## Возможности

### Аутентификация

- Регистрация пользователей
- Вход и выход из системы
- Cookie-based аутентификация

### Управление аккаунтом

- Удаление своего аккаунта
- Просмотр информации о пользователях

### Посты

- Создание постов с автоматическим извлечением хештегов
- Редактирование своих постов
- Удаление своих постов
- Просмотр постов пользователя (с пагинацией и сортировкой)
- Просмотр ленты постов из подписок
- Просмотр постов по хештегу

### Подписки

- Подписка на других пользователей
- Отписка
- Просмотр списка подписок
- Просмотр списка подписчиков
- Просмотр взаимных подписок

### Система оценок

- Оценка постов (upvote/downvote)
- Отзыв оценки
- Сортировка постов по рейтингу
- Рейтинг пользователей

### Модерация

- Редактирование чужих постов
- Удаление чужих постов
- Удаление аккаунтов пользователей

### Администрирование

- Изменение ролей пользователей
- Все возможности модерации

## Установка

### Предварительные требования

- Node.js (v18 или выше)
- PostgreSQL (v14 или выше)

### Шаги установки

1. Установите зависимости:

```bash
npm install
```

2. Создайте базу данных PostgreSQL:

```bash
createdb social_network
```

3. Скопируйте файл конфигурации:

```bash
cp .env.example .env
```

4. Отредактируйте `.env` и укажите параметры подключения к базе данных:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=social_network
PORT=3000
```

5. Инициализируйте базу данных (создание схемы и администратора):

```bash
npm run init-db
```

Будет создан аккаунт администратора:

- Логин: `admin`
- Пароль: `admin123`

## Запуск

### Режим разработки

```bash
npm run start:dev
```

### Продакшн

```bash
npm run build
npm start
```

Приложение будет доступно по адресу: `http://localhost:3000`

## API Документация

Swagger документация доступна по адресу: `http://localhost:3000/api`

### Основные эндпоинты

#### Аутентификация

- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /auth/logout` - Выход

#### Пользователи

- `DELETE /users/me` - Удалить свой аккаунт
- `DELETE /users/:id` - Удалить аккаунт (модератор/админ)
- `PATCH /users/:id/role` - Изменить роль (админ)
- `GET /users/by-login/:login` - Информация о пользователе
- `GET /users/rating` - Список пользователей с рейтингом

#### Посты

- `POST /posts` - Создать пост
- `GET /posts/my` - Свои посты
- `GET /posts/feed` - Лента постов из подписок
- `GET /posts/hashtag/:hashtag` - Посты по хештегу
- `GET /posts/user/:login` - Посты пользователя
- `PATCH /posts/:id` - Редактировать пост
- `DELETE /posts/:id` - Удалить пост
- `POST /posts/:id/rate` - Оценить пост
- `DELETE /posts/:id/rate` - Отозвать оценку

#### Подписки

- `POST /subscriptions/:userId` - Подписаться
- `DELETE /subscriptions/:userId` - Отписаться
- `GET /subscriptions/my/subscriptions` - Мои подписки
- `GET /subscriptions/my/subscribers` - Мои подписчики
- `GET /subscriptions/my/mutual` - Взаимные подписки

## Безопасность

- Все пароли хешируются с использованием bcrypt
- Защита от SQL-инъекций через параметризованные запросы
- Валидация входных данных с использованием class-validator
- Проверка прав доступа на уровне guards и middleware

## Архитектура

Проект построен по слоистой архитектуре:

- `Controllers` - обработка HTTP запросов
- `Services` - бизнес-логика
- `Database` - работа с PostgreSQL через pg
- `Guards` - авторизация и проверка ролей
- `Middleware` - аутентификация пользователей
- `DTOs` - валидация входных данных

## Схема базы данных

### Таблицы

- `users` - Пользователи (id, login, password_hash, role)
- `posts` - Посты (id, author_id, content, created_at, updated_at)
- `hashtags` - Хештеги (id, tag)
- `post_hashtags` - Связь постов и хештегов
- `subscriptions` - Подписки (subscriber_id, subscribed_to_id)
- `post_ratings` - Оценки постов (user_id, post_id, rating_value)

### Роли пользователей

- `user` - Обычный пользователь
- `moderator` - Модератор
- `admin` - Администратор

## Разработка

### Структура проекта

```
src/
├── auth/              # Модуль аутентификации
├── users/             # Модуль пользователей
├── posts/             # Модуль постов
├── subscriptions/     # Модуль подписок
├── database/          # Модуль работы с БД
├── common/            # Общие компоненты
│   ├── dto/          # Data Transfer Objects
│   ├── guards/       # Guards для авторизации
│   ├── decorators/   # Декораторы
│   └── middleware/   # Middleware
├── config/           # Конфигурация
└── scripts/          # Скрипты инициализации
```

## Примеры использования

### Регистрация и вход

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"login":"user1","password":"password123"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"user1","password":"password123"}' \
  -c cookies.txt
```

### Создание поста с хештегами

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"content":"Мой первый пост #welcome #nestjs"}'
```

### Подписка на пользователя

```bash
curl -X POST http://localhost:3000/subscriptions/2 \
  -b cookies.txt
```

### Просмотр ленты

```bash
curl http://localhost:3000/posts/feed?page=1&limit=20&order=desc \
  -b cookies.txt
```
