import "dotenv/config";
import prisma from "../lib/prisma";
import { hashPassword } from "better-auth/crypto";
import readline from "readline";
import crypto from "crypto";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log("\n=========================================================");
  console.log("   👑 Creación de Usuario Administrador Inicial   ");
  console.log("=========================================================\n");
  
  const name = await question("Nombre Completo: ");
  if (!name.trim()) {
    console.error("❌ Error: El nombre es obligatorio.");
    process.exit(1);
  }

  const email = await question("Correo Electrónico Institucional: ");
  if (!email.trim() || !email.includes("@")) {
    console.error("❌ Error: Correo electrónico inválido.");
    process.exit(1);
  }

  const password = await question("Contraseña (mínimo 8 caracteres): ");
  if (password.length < 8) {
    console.error("❌ Error: La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const identificacion = await question("Número de Identificación (C.C. / Doc): ");
  if (!identificacion.trim()) {
    console.error("❌ Error: La identificación es obligatoria.");
    process.exit(1);
  }

  const emailNorm = email.trim().toLowerCase();

  // Verificar si ya existe usuario con este email
  const existing = await prisma.user.findUnique({
    where: { email: emailNorm },
  });
  if (existing) {
    console.error("❌ Error: Ya existe un usuario registrado con este correo electrónico.");
    process.exit(1);
  }

  console.log("\n⚙️  Registrando Administrador en la base de datos...");

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: emailNorm,
        name: name.trim(),
        role: "admin", // Rol superior con privilegios de Administración General
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    });

    const nameParts = name.trim().split(/\s+/);
    const nombres = nameParts[0] || "Administrador";
    const apellido = nameParts.slice(1).join(" ") || "General";

    await tx.profile.create({
      data: {
        userId,
        identificacion: identificacion.trim(),
        nombres,
        apellido,
        telefono: null,
        dataProcessingConsent: true,
        dataProcessingConsentDate: new Date(),
      },
    });
  });

  console.log("\n=========================================================");
  console.log(`✅ ¡Éxito! Administrador creado correctamente:`);
  console.log(`👤 Nombre:         ${name.trim()}`);
  console.log(`📧 Correo:         ${emailNorm}`);
  console.log(`🆔 Identificación: ${identificacion.trim()}`);
  console.log(`👑 Rol:            Administrador (admin)`);
  console.log("=========================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error inesperado al crear el administrador:", e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
