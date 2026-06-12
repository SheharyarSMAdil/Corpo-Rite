CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL UNIQUE,
  "emailVerified" timestamp,
  "image" text
);

CREATE TABLE IF NOT EXISTS "account" (
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "user_credits" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "balance" integer DEFAULT 0 NOT NULL,
  "free_reset_at" timestamp
);

CREATE TABLE IF NOT EXISTS "extension_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "delta" integer NOT NULL,
  "reason" text NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
