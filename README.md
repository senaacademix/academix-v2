# 🎓 AcademiX V2 — Plataforma Integral de Gestión Académica

> ⚠️ **Aviso de Licencia y Términos de Uso:**  
> Este software está protegido por una **licencia de uso gratuito pero de código cerrado**. Está **estrictamente prohibido** modificar, descompilar o reutilizar su código fuente sin autorización expresa. Asimismo, está **estrictamente prohibido** su uso para el control laboral o supervisión punitiva de docentes, instructores o administrativos. Lea el archivo `LICENSE` para más detalles.

---

## 📌 Descripción General

**AcademiX V2** es una solución web integral diseñada para la gestión académica, control de asistencia, seguimiento conductual (observador digital), calificaciones y planificación horaria de centros de formación técnica y profesional, alineada con el modelo educativo del **SENA (Servicio Nacional de Aprendizaje)** de Colombia.

La plataforma conecta en tiempo real a cuatro roles institucionales: **Administradores**, **Gestores Académicos**, **Instructores/Docentes** y **Aprendices/Estudiantes**.

---

## ⚡ Características Principales por Rol

### 👑 Administrador (Admin)
- **Gestión Unificada**: Creación y control de Usuarios, Programas de Formación, Fichas, Competencias y Ambientes.
- **Suplantación de Usuario (*Impersonation*)**: Asistencia técnica en tiempo real mediante suplantación de sesión segura con registro de auditoría.
- **Motor de Horarios Anticolisión**: Generador interactivo de horarios con detección automática de traslapes de docentes, aulas e intensidades horarias.
- **Bandeja de Permisos Extemporáneos**: Aprobación o rechazo de solicitudes de modificación de asistencia fuera de fecha.

### 📂 Gestor Académico
- **Coordinación de Programas**: Monitoreo y control académico delimitado por los programas de formación bajo su supervisión.
- **Seguimiento de Avance**: Análisis de cobertura de fichas, competencias e indicadores docentes.

### 👨‍🏫 Instructor / Docente
- **Planilla de Asistencia Matricial**: Registro diario de asistencia con deslizamiento táctil responsivo (`Presente`, `Falta`, `Tarde`, `Retiro Temprano`, `Excusa`).
- **Calificaciones y Evaluación**: Estructuración de evaluaciones con ponderaciones por porcentaje o puntos.
- **Observador Digital del Aprendiz**: Registro de felicitaciones o llamados de atención disciplinarios con control de acuse de recibo.
- **Planes de Mejoramiento**: Asignación y seguimiento de compromisos académicos con firma digital y recepción de evidencias.
- **Dinámicas de Grupo**: Herramientas integradas de sorteo y ruleta para participación en clase.

### 🎓 Estudiante / Aprendiz
- **Expediente Académico Integral**: Consulta unificada de notas acumuladas, boletines y promedio por materia.
- **Justificación Digital de Inasistencias**: Carga directa de motivos e incapacidades médicas para revisión del instructor.
- **Portal Responsivo Táctil**: Acceso optimizado para dispositivos móviles y tablets.

---

## 🛠️ Stack Tecnológico

- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org), TypeScript 5.x, [Tailwind CSS](https://tailwindcss.com), [Shadcn UI](https://ui.shadcn.com), Framer Motion.
- **Base de Datos & ORM**: PostgreSQL, [Prisma ORM](https://www.prisma.io) (Client Singleton con pool `pg`).
- **Autenticación**: Better Auth con persistencia en PostgreSQL, cookies HTTP-Only y RBAC.
- **Reportes & Exportaciones**: `@react-pdf/renderer` (PDF) y `exceljs` (Excel).
- **Gráficos & Analítica**: Recharts y Chart.js.

---

## 📁 Estructura del Proyecto

```
src/
├── app/                           # Enrutamiento Next.js (App Router)
├── components/                    # Componentes UI globales (Shadcn, Sidebar, Header, Gráficos)
├── features/                      # Arquitectura basada en características (Modular Feature-Based)
│   ├── admin/                     # Módulo de administración general
│   ├── auth/                      # Servicios de autenticación y sesión
│   ├── gestor/                    # Módulo para gestores académicos
│   ├── home/                      # Dashboards dinámicos por rol
│   ├── schedule-manager/          # Programador de horarios y novedades
│   ├── student/                   # Expediente del aprendiz y calificaciones
│   └── teacher/                   # Planilla de asistencia, notas y planes de mejoramiento
├── lib/                           # Clientes de BD (Prisma), autenticación y utilidades
└── scripts/                       # Scripts CLI administrativos (creación de usuarios iniciales)
```

---

## 🚀 Instalación y Despliegue Local

### 1. Prerrequisitos
- **Node.js**: `v20.x` o superior
- **PostgreSQL**: Servidor PostgreSQL activo
- **npm** o **pnpm**

### 2. Configurar Variables de Entorno
Cree un archivo `.env` en la raíz del proyecto basándose en las siguientes variables clave:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/academix_db?schema=public"
BETTER_AUTH_SECRET="tu_secreto_super_seguro"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Generar Cliente y Ejecutar Migraciones de Prisma
```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Crear Administrador Inicial
Ejecute el script interactivo CLI para registrar el primer usuario Administrador:

```bash
npm run create-admin
```

### 6. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) en su navegador para acceder a la aplicación.

---

## 📜 Licencia

Software distribuido bajo **Licencia Propiedad Restringida de Uso Gratuito**. Consulte el archivo [`LICENSE`](LICENSE) para obtener más detalles sobre los términos y restricciones legales.
