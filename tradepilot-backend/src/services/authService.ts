import { writableJournalSchema } from '../utils/schemaCompatibility';
import bcrypt from "bcrypt";
import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { RegisterInput, LoginInput } from "../types/dto";
import { withUserLock } from '../utils/withUserLock';
import {loginSession} from '../security/service';

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const schema=await writableJournalSchema();
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email, password: hashedPassword },
    });
    await tx.tradingAccount.create({
      select:schema.financial?undefined:schema.accountSelect,
      data: {
        userId: user.id,
        name: "Main Account",
        startingBalance: 0,
        currency: "USD",
        isCurrent: true,
      },
    });
    return user;
  });

  return { id: result.id, name: result.name, email: result.email };
}

export async function login(input: LoginInput,label?:string) {
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

  const token = await loginSession(user.id,user.password,label);

  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return { id: user.id, name: user.name, email: user.email };
}

export async function updateProfile(userId: string, input: {name:string;email:string;currentPassword?:string}) {
  return withUserLock(userId, async tx => {
    const user = await tx.user.findUnique({where:{id:userId}});
    if (!user) throw new AppError('User not found',404);
    if (input.email !== user.email && (!input.currentPassword || !await bcrypt.compare(input.currentPassword,user.password))) {
      throw new AppError('Current password is required to change your email address',403);
    }
    return tx.user.update({where:{id:userId},data:{name:input.name,email:input.email},select:{id:true,name:true,email:true}});
  });
}
