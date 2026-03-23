import bcrypt from "bcrypt";
import { prisma } from "../src/db/prisma.js";
import { PlatformRole, UserStatus } from "../src/generated/prisma/enums.js";

interface CliOptions {
  email: string;
  password: string;
  name?: string;
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function getOptions(): CliOptions {
  const email = readArg("--email");
  const password = readArg("--password");
  const name = readArg("--name");

  if (!email || !password) {
    throw new Error(
      "Usage: pnpm --dir apps/desktop-companion dev:create-user --email <email> --password <password> [--name <name>]"
    );
  }

  return {
    email: email.toLowerCase().trim(),
    password,
    name: name?.trim() || null || undefined,
  };
}

async function main(): Promise<void> {
  const options = getOptions();
  const passwordHash = await bcrypt.hash(options.password, 12);

  const user = await prisma.user.upsert({
    where: { email: options.email },
    update: {
      name: options.name ?? null,
      passwordHash,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      platformRole: PlatformRole.USER,
    },
    create: {
      email: options.email,
      name: options.name ?? null,
      passwordHash,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      platformRole: PlatformRole.USER,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: user.id,
        email: user.email,
        note: "The first successful login will auto-create the user's personal workspace if none exists.",
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
