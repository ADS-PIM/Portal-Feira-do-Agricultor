create table `administrators` (
    `id` char(36) not null,
    `name` varchar(255) not null,
    `email` varchar(320) not null,
    `hashPassword` varchar(255) not null,
    `role` enum('normal', 'master') not null,
    `active` boolean not null,
    `createdAt` date not null,
    `profile_picture` varchar(2048) default null,
    primary key (`id`),
    unique key `administrators_unique` (`email`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `events` (
    `id` char(36) not null,
    `title` varchar(255) not null,
    `date` date not null,
    `description` varchar(1000) default null,
    `startAt` time not null,
    `endAt` time not null,
    `localAddress` varchar(255) not null,
    `localLatitude` decimal(10,8) not null,
    `localLongitude` decimal(11,8) not null,
    `state` enum('PENDING', 'CANCELED', 'CONCLUDED', 'RESCHEDULED', 'HAPPENING') not null,
    `bannerImage` varchar(2048) default null,
    `createdAt` datetime(6) not null default current_timestamp(6),
    `administratorId` char(36) not null,
    primary key (`id`),
    key `events_administrators_FK` (`administratorId`),
    constraint `events_administrators_FK` foreign key (`administratorId`) references `administrators` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `images` (
    `id` char(36) not null,
    `imageUrl` varchar(2048) not null,
    `description` varchar(1000) default null,
    `eventId` char(36) not null,
    primary key (`id`),
    key `images_events_FK` (`eventId`),
    constraint `images_events_FK` foreign key (`eventId`) references `events` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `businessInfo` (
    `id` char(36) not null,
    `instagramAccount` varchar(64) not null,
    `whatsappNumber` varchar(20) not null,
    `businessEmail` varchar(320) not null,
    `businessHours` varchar(255) not null,
    `updatedAt` date not null,
    primary key (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `message` (
    `id` char(36) not null,
    `name` varchar(255) not null,
    `email` varchar(320) not null,
    `phone` varchar(20) default null,
    `subject` enum('DOUBT', 'SUGGESTION', 'COMPLAINT', 'PARTNERSHIP', 'OTHER') not null,
    `message` varchar(1500) not null,
    `submitDate` timestamp not null,
    `title` varchar(255) not null,
    primary key (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;

create table `refresh_tokens` (
    `id` char(36) not null,
    `adminId` char(36) not null,
    `tokenHash` varchar(281) not null,
    `createdAt` date not null,
    `expiresAt` date not null,
    `revokedAt` date default null,
    primary key (`id`),
    key `refreshTokens_administrators_FK` (`adminId`),
    constraint `refreshTokens_administrators_FK` foreign key (`adminId`) references `administrators` (`id`)
)engine = InnoDB default CHARSET = utf8mb4 collate = utf8mb4_general_ci;


