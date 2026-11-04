# AuditaProcesos

Con **Detecto**, el asistente de auditoría de Detecta Clínica. Sistema web **gratuito y sin servidor** para planificar, ejecutar e informar **auditorías de procesos**. Cualquier auditor lo abre desde el navegador (computadora, tablet o celular), elige o crea sus listas de verificación y obtiene su informe en PDF y Excel.

**Abrir el sistema:** https://fabriziolazarocasas1122-commits.github.io/Auditorprocesos/

La metodología sigue las 5 etapas de la **ISO 19011**:

| Etapa | Qué haces en el sistema |
|---|---|
| 1. Planificación | Defines el objetivo, el alcance, los criterios, el equipo, las fechas y los procesos a auditar |
| 2. Lista de verificación | Marcas cada requisito como *Cumple / Parcial / No cumple / N/A* y registras la evidencia objetiva |
| 3. Hallazgos | Se generan solos y los clasificas como NC mayor, NC menor, observación u oportunidad de mejora |
| 4. Informe | Informe automático con % de cumplimiento, hallazgos, conclusiones y firmas → PDF / Excel |
| 5. Seguimiento | Plan de acción: causa raíz, acción correctiva, responsable, fecha y estado |

## Plantillas incluidas

- **PR-01** Admisión del paciente ambulatorio
- **PR-02** Atención médica ambulatoria
- **PR-03** Agendamiento de citas
- **PR-04** Cuadre de caja
- **DOC** Revisión documental de procedimientos (genérica, sirve para cualquier proceso)

Cualquier auditor puede **crear sus propias plantillas**, duplicar las existentes y compartirlas como archivo `.json`.

## Cómo publicarlo en GitHub (gratis)

1. Crea un repositorio nuevo en GitHub (por ejemplo `Auditorprocesos`) y sube todos estos archivos.
2. En el repositorio entra a **Settings → Pages**.
3. En *Source* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guarda.
4. En 1–2 minutos tendrás el enlace: `https://TU-USUARIO.github.io/Auditorprocesos/`

Comparte ese enlace con los auditores. No necesitan instalar nada ni crear una cuenta.

## Cómo se guardan los datos

- Cada auditor guarda sus auditorías **en su propio navegador** (localStorage). Nada se envía a ningún servidor, lo que protege datos sensibles como historias clínicas.
- **Exportar .json**: sirve para respaldar una auditoría o enviarla a otro auditor, que la abre con **Importar .json**.
- **Exportar Excel (.csv)**: genera la lista completa con resultados, hallazgos y plan de acción.
- **Imprimir / Guardar PDF**: genera el informe formal listo para firmar.

> Si borras los datos del navegador o usas el modo incógnito, se pierden las auditorías que no hayas exportado. Exporta el `.json` al terminar cada jornada.

## Cálculo del cumplimiento

`Cumplimiento = (Cumple + 0,5 × Parcial) ÷ requisitos evaluados` (no cuentan N/A ni pendientes)

| Rango | Nivel |
|---|---|
| ≥ 90 % | Satisfactorio |
| 75 – 89 % | Aceptable |
| 50 – 74 % | En desarrollo |
| < 50 % | Crítico |

## Estructura

```
index.html          Página principal
css/styles.css      Estilos (modo claro/oscuro, impresión y celular)
js/plantillas.js    Plantillas base de las listas de verificación
js/app.js           Lógica de la aplicación
img/                Mascota Detecto (logo e ilustraciones)
```

Para agregar plantillas base para todos los usuarios, edita `js/plantillas.js` siguiendo el mismo formato.

## Probar en tu computadora

Abre `index.html` con doble clic, o levanta un servidor local:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Licencia

MIT. Puedes usarlo, modificarlo y compartirlo libremente.

Autor: Fabrizio Lázaro Casas
