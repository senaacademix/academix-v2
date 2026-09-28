# AcademiX 

---

## 1. Visión General y Propósito del Sistema

**AcademiX** es un ecosistema tecnológico integral diseñado para la transformación digital, gestión académica, control formativo y administración institucional en centros de educación técnica, tecnológica y superior, estructurado bajo los lineamientos y el modelo pedagógico del **SENA (Servicio Nacional de Aprendizaje)** de Colombia.

### El Problema que Resuelve
* **Dispersión de información:** Procesos fragmentados entre hojas de cálculo y plataformas aisladas.
* **Falta de trazabilidad y rigor normativo:** Dificultad para auditar llamados de atención, compromisos formativos y procesos democráticos de vocería estudiantil conforme a reglamentos oficiales.
* **Cálculo impreciso de inasistencias:** Pérdida de control sobre tardanzas fraccionadas y retiros tempranos que afectan el rendimiento y la permanencia.
* **Conflictos de infraestructura y horarios:** Cruces de aulas, sobrecarga docente y colisiones horarias.

### Propósito Fundamental
Centralizar en una sola plataforma moderna, reactiva y segura la administración curricular, la planificación horaria anticolisión, la asistencia matricial con cálculo de horas perdidas, la evaluación jerárquica con penalización por inasistencia, el observador digital con acuse de recibo legal, los planes de mejoramiento con flujo de firmas y el sistema electoral democrático de voceros.

---

## 2. Matriz de Roles y Administración Institucional 

El sistema opera bajo un estricto control de acceso basado en 5 roles:

| Rol | Enfoque Principal | Alcance y Responsabilidades |
| :--- | :--- | :--- |
| **Administrador (`admin`)** | Administración Global, Seguridad e Infraestructura | Control total del sistema, gestión de directivos, configuración de sedes, aulas, programas |
| **Gestor Académico (`gestor`)** | Coordinación Operativa de Programas | Administración de programas formativos asignados, estructuración de trimestres/competencias, matrícula e importación masiva de aprendices desde Excel, traslados y supervisión horaria. |
| **Observador (`observer`)** | Inspección y Calidad Pedagógica | Acceso estricto en **Modo Solo Lectura** a programas y fichas autorizadas para fines de supervisión pedagógica, consulta de actas e informes. |
| **Docente / Instructor (`teacher`)** | Gestión Pedagógica y de Aula | Registro de asistencia diaria con cálculo de horas perdidas, configuración de evaluaciones ponderadas, aplicación de penalizaciones, observador digital, planes de mejoramiento y herramientas de clase. |
| **Aprendiz / Estudiante (`student`)** | Autogestión y Participación Democrática | Consulta transparente de calificaciones y desglose de penalizaciones, radicación de justificaciones, acuse de recibo de observaciones, firma de planes de mejora, postulación y voto secreto a vocería. |

---

## 3. Módulos y Funcionalidades Clave del Sistema

### 3.1. Motor de Planificación Horaria y Detección Anticolisión
* **Asignación Multidimensional:** Cruce de franjas horarias (lunes a domingo), fichas (grupos), ambientes (aulas/laboratorios) e instructores.
* **Algoritmo Anticolisión en Tiempo Real:** Bloquea automáticamente cruces de instructores en dos clases simultáneas, ocupación doble de ambientes de aprendizaje, violación de disponibilidades declaradas y superación de la carga horaria máxima semanal permitida.
* **Flujo de Publicación:** Manejo de horarios en estado *Borrador* hasta su publicación formal definitiva.

### 3.2. Planilla de Asistencia Matricial y Cálculo Exacto de Horas Perdidas
* **5 Estados de Asistencia:**
  1. `PRESENT` (Presente).
  2. `ABSENT` (Inasistencia injustificada - acumula horas completas).
  3. `LATE` (Llegada tarde con selector horario exacto que computa los minutos/horas lectivas perdidas).
  4. `LEAVE_EARLY` (Retiro anticipado con selector horario que calcula las horas no cursadas).
  5. `EXCUSED` (Inasistencia justificada formalmente).
* **Bloqueo Semanal Antifraude y Permisos Extemporáneos:** Cierre automático de semanas pasadas; los instructores solo pueden modificarlas solicitando formalmente un permiso extemporáneo al Gestor o Administrador.
* **Radicación Digital de Excusas:** Los aprendices suben soportes e incapacidades directamente a la plataforma para evaluación y aval del instructor.

### 3.3. Evaluación Jerárquica Ponderada y Motor de Penalización por Inasistencia
* **Estructura Jerárquica Flexible:**
  $$\text{Competencia (100\%)} \rightarrow \text{Cortes (ej. 30\%, 30\%, 40\%)} \rightarrow \text{Grupos de Actividades} \rightarrow \text{Actividades/Evidencias}$$
* **Motor Matemático de Penalización Transparente:**
  * Deducción paramétrica de nota sobre la calificación definitiva en función de la sumatoria de horas perdidas (faltas + tardanzas + retiros) frente a las horas totales de la competencia.
  * Desglose pedagógico visible tanto para el docente como para el estudiante, erradicando discrepancias en reclamos de notas.

### 3.4. Observador Digital y Bitácora Formativa con Validez Jurídica
* **Tipología de Anotaciones:** Llamados de atención (`ATTENTION`), Felicitaciones (`COMMENDATION`), Citaciones a comité (`CITATION`) y Seguimiento pedagógico (`OTHER`).
* **Acuse de Recibo Inmutable (`viewedAt`):** Registro de fecha y hora exacta en que el aprendiz visualiza la anotación en su portal, constituyendo prueba de notificación para comités de evaluación y disciplina.

### 3.5. Circuito Legal de Planes de Mejoramiento
* Flujo documental digital de 5 etapas:
  1. Formulación del plan y radicado por el instructor con carga de guía/compromisos.
  2. Notificación al aprendiz y carga de compromiso con firma digital.
  3. Validación y contrafirma del instructor.
  4. Entrega de evidencias académicas por el aprendiz.
  5. Evaluación, nota cuantitativa de recuperación y cierre de acta por el instructor con visibilidad para el Gestor.

### 3.6. Sistema Democrático de Elección y Posesión de Voceros (Reglamento SENA)
* **Apertura y Postulación Libre:** Habilitación de comicios por ficha; los aprendices postulan sus propuestas de vocería.
* **Cabina de Votación Secreta a Pantalla Completa:** Experiencia inmersiva que garantiza el sufragio secreto, individual, irrepetible e inalterable, incluyendo opción de **Voto en Blanco**.
* **Escrutinio en Vivo y Proclamación:** Conteo transparente en tiempo real, asignación automática de **Vocero Principal** y **Vocero Suplente**, y asignación de insignia institucional (`StudentVoceroBadge`) en perfiles y listas.
* **Acta Oficial de Posesión en PDF:** Generación automática con diseño institucional SENA, firmas de los implicados y validez jurídica.

### 3.7. Centro de Herramientas Pedagógicas e Institucionales (Tools Hub)
* **Análisis de Juicios Evaluativos de Sofía Plus:** Procesamiento 100% en cliente de archivos de Sofia Plus, análisis matricial de Resultados de Aprendizaje (Aprobados vs. Por Evaluar) y exportación a Excel/PDF.
* **Ruleta de Participación y Calificaciones:** Animación física con sonido sintetizado Web Audio API, calificación cuantitativa inmediata, reincorporación no destructiva de aprendices y exportación oficial de resultados.
* **Creador de Grupos de Trabajo:** Algoritmo de distribución aleatoria balanceada, tablero interactivo Drag & Drop, persistencia JSON y exportación multihoja a Excel.
* **Módulo de Anuncios y Comunicación Institucional:** Publicación de noticias, convocatorias e instructivos con soporte para artículos fijados, extractos automáticos y programación de fechas de vigencia.

---

## 4. Puntos Fuertes para Destacar en la Presentación

1. **Alineación 100% Normativa:** Diseñado a la medida del modelo de formación profesional integral del SENA y educación técnica superior.
2. **Cero Papel y Legalidad Digital:** Actas de posesión, compromisos de planes de mejoramiento y acuses de recibo del observador totalmente digitalizados con validez probatoria.
3. **Equidad y Transparencia:** La penalización por inasistencia y la evaluación jerárquica muestran fórmulas claras para docentes y aprendices.
4. **Democracia Digital:** Elecciones de voceros blindadas contra fraude con cabina secreta y escrutinio instantáneo.
5. **Experiencia de Usuario Sobresaliente:** 17 temas de color, diseño responsive, interacción háptica/sonora y paneles dinámicos de alta velocidad.
6. **Autonomía Operativa:** Herramientas de aula integradas (Sofía Plus, Ruleta, Grupos, Anuncios) que reducen la carga administrativa del docente en un 70%.

---

## 5. Preguntas Clave que Responde este Documento en NotebookLM

* *¿Cuál es el valor agregado de AcademiX frente a un LMS tradicional como Moodle o Classroom?*  
  R: AcademiX no es solo un repositorio de tareas; es un sistema de administración y control integral que gestiona horarios anticolisión, asistencia con cálculo de horas perdidas, sanciones formativas, observador digital con valor jurídico y elecciones democráticas de voceros.
* *¿Cómo garantiza el sistema la seguridad y transparencia en la evaluación?*  
  R: Mediante el desglose matemático público de notas y penalizaciones, y autenticación con control de roles estrictos.
* *¿Qué impacto tiene para los directivos y coordinadores académicos?*  
  R: Visibilidad en tiempo real de deserción temprana, analítica de asistencia consolidada, supervisión curricular y optimización al 100% de la infraestructura de aulas y docentes.
