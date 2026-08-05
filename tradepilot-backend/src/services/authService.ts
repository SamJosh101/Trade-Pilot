import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { RegisterInput, LoginInput } from "../types/dto";

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email, password: hashedPassword },
    });
    await tx.tradingAccount.create({
      data: {
        userId: user.id,
        name: "Main Account",
        startingBalance: 0,
        currency: "USD",
      },
    });
    return user;
  });

  return { id: result.id, name: result.name, email: result.email };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    // Same message for "no such user" and "wrong password" — don't reveal
    // which one it was, so an attacker can't enumerate valid emails.
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign({ userId: user.id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);

  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return { id: user.id, name: user.name, email: user.email };
}
