/*
  Warnings:

  - Added the required column `maxMsgSize` to the `Settings` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "maxDownload" INTEGER,
    "password" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "autherId" INTEGER,
    FOREIGN KEY ("autherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FileUpload" ("id", "createdAt", "updatedAt", "expiresAt", "maxDownload", "password", "filename", "downloads", "viewCount", "message", "autherId") SELECT "id", "createdAt", "updatedAt", "expiresAt", "maxDownload", "password", "filename", "downloads", "viewCount", "message", "autherId" FROM "FileUpload";
DROP TABLE "FileUpload";
ALTER TABLE "new_FileUpload" RENAME TO "FileUpload";
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unsafe" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "maxSize" INTEGER NOT NULL DEFAULT 51200,
    "maxMsgSize" INTEGER NOT NULL,
    "hashRounds" INTEGER NOT NULL DEFAULT 14,
    "hashMemory" INTEGER NOT NULL DEFAULT 32768,
    "hashPara" INTEGER NOT NULL DEFAULT 4
);
INSERT INTO "new_Settings" ("id", "unsafe", "language", "theme", "maxSize", "hashRounds", "hashMemory", "hashPara") SELECT "id", "unsafe", "language", "theme", "maxSize", "hashRounds", "hashMemory", "hashPara" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
