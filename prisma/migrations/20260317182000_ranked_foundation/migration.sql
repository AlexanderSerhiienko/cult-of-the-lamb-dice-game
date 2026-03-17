-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('BOT', 'ONLINE', 'RANKED');

-- CreateEnum
CREATE TYPE "MatchOutcome" AS ENUM ('WIN', 'LOSE', 'DRAW');

-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('PRIVATE', 'RANKED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'IN_GAME', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoomMemberRole" AS ENUM ('HOST', 'PLAYER');

-- CreateEnum
CREATE TYPE "GameMatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GameMatchEndReason" AS ENUM ('NORMAL', 'TIMEOUT', 'DISCONNECT', 'LEAVE', 'DRAW');

-- CreateEnum
CREATE TYPE "GameMatchEventType" AS ENUM ('MATCH_CREATED', 'MATCH_STARTED', 'DICE_ROLLED', 'MOVE_SUBMITTED', 'MOVE_APPLIED', 'MATCH_FINISHED', 'PLAYER_DISCONNECTED', 'PLAYER_RECONNECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "AppRole" NOT NULL DEFAULT 'USER',
    "rankedMmr" INTEGER NOT NULL DEFAULT 0,
    "rankedWins" INTEGER NOT NULL DEFAULT 0,
    "rankedLosses" INTEGER NOT NULL DEFAULT 0,
    "rankedDraws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "externalMatchId" TEXT NOT NULL,
    "mode" "MatchMode" NOT NULL,
    "outcome" "MatchOutcome" NOT NULL,
    "playerScore" INTEGER NOT NULL,
    "opponentScore" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "visibility" "RoomVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "hostId" TEXT NOT NULL,
    "currentMatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'PLAYER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatch" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "status" "GameMatchStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "winnerUserId" TEXT,
    "mode" "MatchMode" NOT NULL DEFAULT 'ONLINE',
    "endedBy" "GameMatchEndReason",
    "player1MmrBefore" INTEGER,
    "player2MmrBefore" INTEGER,
    "player1MmrAfter" INTEGER,
    "player2MmrAfter" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL DEFAULT 'idle',
    "currentRoll" INTEGER,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "finalScore" INTEGER,
    "outcome" "MatchOutcome",
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventType" "GameMatchEventType" NOT NULL,
    "actorUserId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "MatchResult_userId_createdAt_idx" ON "MatchResult"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchResult_mode_createdAt_idx" ON "MatchResult"("mode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_userId_externalMatchId_key" ON "MatchResult"("userId", "externalMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Room_currentMatchId_key" ON "Room"("currentMatchId");

-- CreateIndex
CREATE INDEX "Room_hostId_createdAt_idx" ON "Room"("hostId", "createdAt");

-- CreateIndex
CREATE INDEX "Room_status_createdAt_idx" ON "Room"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RoomMember_userId_joinedAt_idx" ON "RoomMember"("userId", "joinedAt");

-- CreateIndex
CREATE INDEX "RoomMember_roomId_role_idx" ON "RoomMember"("roomId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "GameMatch_roomId_createdAt_idx" ON "GameMatch"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "GameMatch_status_createdAt_idx" ON "GameMatch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatchParticipant_matchId_userId_key" ON "GameMatchParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatchParticipant_matchId_seat_key" ON "GameMatchParticipant"("matchId", "seat");

-- CreateIndex
CREATE INDEX "GameMatchEvent_matchId_createdAt_idx" ON "GameMatchEvent"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatchEvent_matchId_seq_key" ON "GameMatchEvent"("matchId", "seq");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_currentMatchId_fkey" FOREIGN KEY ("currentMatchId") REFERENCES "GameMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatchParticipant" ADD CONSTRAINT "GameMatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatchParticipant" ADD CONSTRAINT "GameMatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatchEvent" ADD CONSTRAINT "GameMatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMatchEvent" ADD CONSTRAINT "GameMatchEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
