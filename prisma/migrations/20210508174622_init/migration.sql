-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Test" (
    "data" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "maxDownload" INTEGER,
    "password" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "downloads" INTEGER NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "autherId" INTEGER,
    FOREIGN KEY ("autherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unsafe" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "maxSize" INTEGER NOT NULL DEFAULT 51200,
    "hashRounds" INTEGER NOT NULL DEFAULT 14,
    "hashMemory" INTEGER NOT NULL DEFAULT 32768,
    "hashPara" INTEGER NOT NULL DEFAULT 4
);

-- CreateIndex
CREATE UNIQUE INDEX "User.name_unique" ON "User"("name");
