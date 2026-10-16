/**
 * Utilidades para variables dinámicas en plantillas de observaciones y correos.
 */

export interface RemarkVariableDefinition {
    key: string;            // e.g. "{{nombre_aprendiz}}"
    token: string;          // e.g. "nombre_aprendiz"
    label: string;          // e.g. "Nombre del Aprendiz"
    description: string;    // e.g. "Nombre completo del aprendiz seleccionado"
    sampleValue: string;    // e.g. "Jhon Alejandro Toro Santa"
    category: "aprendiz" | "ficha" | "instructor" | "sistema";
}

export const REMARK_AVAILABLE_VARIABLES: RemarkVariableDefinition[] = [
    {
        key: "{{nombre_aprendiz}}",
        token: "nombre_aprendiz",
        label: "Nombre Aprendiz",
        description: "Nombre completo del aprendiz según su perfil",
        sampleValue: "Jhon Alejandro Toro Santa",
        category: "aprendiz"
    },
    {
        key: "{{identificacion}}",
        token: "identificacion",
        label: "Documento / Cédula",
        description: "Número de identificación o documento del aprendiz",
        sampleValue: "1098765432",
        category: "aprendiz"
    },
    {
        key: "{{correo_aprendiz}}",
        token: "correo_aprendiz",
        label: "Correo Aprendiz",
        description: "Correo electrónico del aprendiz",
        sampleValue: "jhon.toro@soy.sena.edu.co",
        category: "aprendiz"
    },
    {
        key: "{{telefono_aprendiz}}",
        token: "telefono_aprendiz",
        label: "Teléfono Aprendiz",
        description: "Teléfono de contacto del aprendiz",
        sampleValue: "310 123 4567",
        category: "aprendiz"
    },
    {
        key: "{{ficha}}",
        token: "ficha",
        label: "Número de Ficha",
        description: "Código o número de la ficha / grupo formativo",
        sampleValue: "2902091",
        category: "ficha"
    },
    {
        key: "{{programa}}",
        token: "programa",
        label: "Programa de Formación",
        description: "Nombre del programa formativo",
        sampleValue: "Análisis y Desarrollo de Software (ADSO)",
        category: "ficha"
    },
    {
        key: "{{jornada}}",
        token: "jornada",
        label: "Jornada",
        description: "Jornada del grupo (Mañana, Tarde, Noche, etc.)",
        sampleValue: "Diurna",
        category: "ficha"
    },
    {
        key: "{{nombre_instructor}}",
        token: "nombre_instructor",
        label: "Nombre Instructor",
        description: "Nombre del instructor que envía la observación",
        sampleValue: "Carlos Alberto Martínez",
        category: "instructor"
    },
    {
        key: "{{fecha_actual}}",
        token: "fecha_actual",
        label: "Fecha Actual",
        description: "Fecha en formato DD/MM/AAAA",
        sampleValue: new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }),
        category: "sistema"
    }
];

export interface InterpolationContext {
    student?: {
        name?: string | null;
        email?: string | null;
        profile?: {
            identificacion?: string | null;
            nombres?: string | null;
            apellido?: string | null;
            telefono?: string | null;
        } | null;
    } | null;
    group?: {
        name?: string | null;
        code?: string | null;
        jornada?: string | null;
        program?: {
            name?: string | null;
        } | null;
    } | null;
    teacherName?: string | null;
    currentDate?: Date | string | null;
    useSampleValues?: boolean;
}

/**
 * Reemplaza variables en un texto (soporta formatos {{variable}} y {variable}, case-insensitive)
 */
export function interpolateRemarkTemplate(text: string | null | undefined, context: InterpolationContext): string {
    if (!text) return "";

    const { student, group, teacherName, currentDate, useSampleValues } = context;

    // Obtener fecha formateada
    let dateStr = "";
    if (currentDate) {
        const d = currentDate instanceof Date ? currentDate : new Date(currentDate);
        dateStr = isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
    } else {
        dateStr = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    // Calcular valores reales
    const studentFullName = student?.profile?.nombres || student?.profile?.apellido
        ? `${student.profile.nombres || ""} ${student.profile.apellido || ""}`.trim()
        : student?.name || "";

    const identification = student?.profile?.identificacion || "";
    const studentEmail = student?.email || "";
    const studentPhone = student?.profile?.telefono || "";
    const fichaNumber = group?.name || group?.code || "";
    const programName = group?.program?.name || "";
    const jornadaStr = group?.jornada || "";
    const teacherStr = teacherName || "";

    // Diccionario de tokens normalizados en minúsculas
    const valuesMap: Record<string, string> = {
        nombre_aprendiz: useSampleValues ? "Jhon Alejandro Toro Santa" : studentFullName,
        nombre: useSampleValues ? "Jhon Alejandro Toro Santa" : studentFullName,
        aprendiz: useSampleValues ? "Jhon Alejandro Toro Santa" : studentFullName,

        identificacion: useSampleValues ? "1098765432" : identification,
        documento: useSampleValues ? "1098765432" : identification,
        documento_aprendiz: useSampleValues ? "1098765432" : identification,
        cedula: useSampleValues ? "1098765432" : identification,

        correo_aprendiz: useSampleValues ? "jhon.toro@soy.sena.edu.co" : studentEmail,
        correo: useSampleValues ? "jhon.toro@soy.sena.edu.co" : studentEmail,
        email: useSampleValues ? "jhon.toro@soy.sena.edu.co" : studentEmail,

        telefono_aprendiz: useSampleValues ? "310 123 4567" : studentPhone,
        telefono: useSampleValues ? "310 123 4567" : studentPhone,

        ficha: useSampleValues ? "2902091" : fichaNumber,
        grupo: useSampleValues ? "2902091" : fichaNumber,
        numero_ficha: useSampleValues ? "2902091" : fichaNumber,

        programa: useSampleValues ? "Análisis y Desarrollo de Software (ADSO)" : programName,
        programa_formacion: useSampleValues ? "Análisis y Desarrollo de Software (ADSO)" : programName,

        jornada: useSampleValues ? "Diurna" : jornadaStr,

        nombre_instructor: useSampleValues ? "Carlos Alberto Martínez" : teacherStr,
        instructor: useSampleValues ? "Carlos Alberto Martínez" : teacherStr,

        fecha_actual: dateStr,
        fecha: dateStr
    };

    // Reemplazar tanto {{variable}} como {variable} de forma insensible a mayúsculas
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/gi, (match, p1, p2) => {
        const token = (p1 || p2 || "").toLowerCase().trim();
        if (token in valuesMap) {
            return valuesMap[token];
        }
        return match; // Mantener si no es una variable reconocida
    });
}
