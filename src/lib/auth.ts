import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import prisma from "./prisma";

export const auth = betterAuth({
  // Configuración de base de datos
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Campos adicionales del usuario expuestos en sesión
  user: {
    additionalFields: {
      role: { type: "string", input: false },
    },
  },

  // Bloquear cualquier intento de registro público directo
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new Error(
            "El autoregistro de aprendices está deshabilitado. Los aprendices solo pueden ser creados por el Gestor Académico."
          );
        },
      },
    },
  },

  // Configuración de email y contraseña (autoregistro deshabilitado)
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
  },

  // Rate Limiting nativo de Better Auth para protección de endpoints de autenticación
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    storage: "memory",
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },

  // Configuración de sesión
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // Actualizar cada 24 horas
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutos
    },
  },

  // Plugin para manejar cookies en Next.js
  plugins: [
    nextCookies(),
    admin({ defaultRole: "student", impersonationSession: false }),
  ],
});