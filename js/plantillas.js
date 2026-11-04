/*
 * Plantillas base de listas de verificación.
 * Cada plantilla es una lista de verificación reutilizable. Los auditores pueden
 * duplicarlas, editarlas o crear las suyas desde la sección "Plantillas".
 *
 * Formato:
 * {
 *   id, codigo, nombre, area, descripcion,
 *   criterios: ["Norma o documento de referencia", ...],
 *   secciones: [{ titulo, items: [{ id, pregunta, referencia, evidencia }] }]
 * }
 */
window.PLANTILLAS_BASE = [
  {
    id: 'base-pr01',
    codigo: 'PR-01',
    nombre: 'Admisión del paciente ambulatorio',
    area: 'Admisión Ambulatoria / ATC',
    descripcion: 'Verifica desde la emisión del ticket hasta la derivación a consultorio y el cobro de servicios adicionales.',
    criterios: [
      'PR-01 Proceso de Admisión del paciente ambulatorio (v01)',
      'Ley N.° 29414, Derechos de las Personas Usuarias de los Servicios de Salud',
      'Ley N.° 29733, Protección de Datos Personales y su Reglamento',
      'Ley N.° 29571, Código de Protección y Defensa del Consumidor (arts. 67 y 68)',
      'R.S. N.° 007-99/SUNAT, Reglamento de Comprobantes de Pago'
    ],
    secciones: [
      {
        titulo: 'Recepción e identificación',
        items: [
          { id: 'pr01-01', pregunta: 'La Anfitriona ATC orienta al paciente para sacar su ticket según el tipo de atención (ambulatoria u hospitalaria).', referencia: 'PR-01 act. 1–2', evidencia: 'Observación directa en el ingreso' },
          { id: 'pr01-02', pregunta: 'Admisión identifica el trámite del paciente y aplica el speech de bienvenida.', referencia: 'PR-01 act. 3', evidencia: 'Observación de atenciones (muestra)' },
          { id: 'pr01-03', pregunta: 'Se solicita el DNI y se valida si el paciente es nuevo o existente.', referencia: 'PR-01 act. 4–5', evidencia: 'Observación / registros en GESTOR' },
          { id: 'pr01-04', pregunta: 'Para paciente nuevo, se crea la HC con los datos requeridos y se informa sobre el tratamiento de datos personales.', referencia: 'PR-01 act. 6; Ley 29733', evidencia: 'Muestra de HC nuevas, formato de consentimiento de datos' },
          { id: 'pr01-05', pregunta: 'Para paciente existente, se validan y actualizan los datos en el sistema.', referencia: 'PR-01 act. 7', evidencia: 'Registros de actualización en GESTOR' }
        ]
      },
      {
        titulo: 'Cita y cobertura del seguro',
        items: [
          { id: 'pr01-06', pregunta: 'Se valida si el paciente tiene cita; si no la tiene, se agenda en el momento.', referencia: 'PR-01 act. 8–10', evidencia: 'Agenda en GESTOR' },
          { id: 'pr01-07', pregunta: 'Para paciente asegurado, se verifica la cobertura en SITEDS.', referencia: 'PR-01 act. 11–13', evidencia: 'Consultas SITEDS de la muestra' },
          { id: 'pr01-08', pregunta: 'Si no hay cobertura, se comunica al paciente antes de la atención.', referencia: 'PR-01 act. 14', evidencia: 'Observación / entrevista a pacientes' },
          { id: 'pr01-09', pregunta: 'Se informa el deducible y el coaseguro antes de la atención.', referencia: 'PR-01 act. 15; Ley 29571 arts. 67–68', evidencia: 'Observación / entrevista a pacientes' },
          { id: 'pr01-10', pregunta: 'Se imprime el SITEDS y se archiva con la atención.', referencia: 'PR-01 act. 16', evidencia: 'Expedientes de atenciones aseguradas' }
        ]
      },
      {
        titulo: 'Pago y derivación',
        items: [
          { id: 'pr01-11', pregunta: 'Se indica el monto a pagar y los métodos de pago aceptados (efectivo, transferencia, Yape/Plin).', referencia: 'PR-01 act. 17; Anexo 1', evidencia: 'Observación' },
          { id: 'pr01-12', pregunta: 'Se consulta boleta o factura y se emite el comprobante de pago correctamente.', referencia: 'PR-01 act. 19–20; Reglamento de Comprobantes de Pago', evidencia: 'Muestra de comprobantes emitidos' },
          { id: 'pr01-13', pregunta: 'El paciente es derivado a consultorio después de completar la admisión.', referencia: 'PR-01 act. 21', evidencia: 'Observación' },
          { id: 'pr01-14', pregunta: 'Los servicios adicionales ordenados por el médico (laboratorio, imágenes) se registran, se cobran y tienen comprobante.', referencia: 'PR-01 act. 23–25', evidencia: 'Órdenes médicas vs. registros y comprobantes' },
          { id: 'pr01-15', pregunta: 'El personal conoce el procedimiento vigente y lo aplica.', referencia: 'PR-01 general', evidencia: 'Entrevista al personal' }
        ]
      }
    ]
  },
  {
    id: 'base-pr02',
    codigo: 'PR-02',
    nombre: 'Atención médica ambulatoria',
    area: 'Counter / Consultorios / Triaje',
    descripcion: 'Verifica la recepción del paciente el día de su cita, el triaje y la atención médica con su registro en la historia clínica.',
    criterios: [
      'PR-02 Proceso de Atención Médica (v01)',
      'Ley N.° 26842, Ley General de Salud',
      'Ley N.° 29414 y D.S. N.° 027-2015-SA',
      'NTS N.° 139-MINSA/2018/DGAIN, Gestión de la Historia Clínica (R.M. 214-2018 y 265-2018)',
      'Ley N.° 29733, Protección de Datos Personales'
    ],
    secciones: [
      {
        titulo: 'Recepción el día de la cita',
        items: [
          { id: 'pr02-01', pregunta: 'El Counter solicita el documento de identidad y verifica la identidad del paciente.', referencia: 'PR-02 act. 1–2', evidencia: 'Observación' },
          { id: 'pr02-02', pregunta: 'Se verifica la cita en el sistema (fecha, hora, especialidad y profesional).', referencia: 'PR-02 act. 3', evidencia: 'Agenda del sistema' },
          { id: 'pr02-03', pregunta: 'La historia clínica llega al consultorio antes de la atención.', referencia: 'PR-02 act. 4', evidencia: 'Observación / registro de movimiento de HC' },
          { id: 'pr02-04', pregunta: 'Se verifica el seguro y se valida la cobertura cuando corresponde.', referencia: 'PR-02 act. 5', evidencia: 'Registros de validación' },
          { id: 'pr02-05', pregunta: 'El paciente sin seguro cuenta con comprobante de pago antes de ser atendido.', referencia: 'PR-02 act. 6', evidencia: 'Comprobantes vs. atenciones del día' }
        ]
      },
      {
        titulo: 'Flujo asistencial y triaje',
        items: [
          { id: 'pr02-06', pregunta: 'El paciente oncológico pasa por triaje y su clasificación queda registrada.', referencia: 'PR-02 act. 8', evidencia: 'Registros de triaje' },
          { id: 'pr02-07', pregunta: 'El paciente no oncológico ingresa a consultorio según el flujo definido.', referencia: 'PR-02 act. 7–8', evidencia: 'Observación' },
          { id: 'pr02-08', pregunta: 'Se respetan la privacidad y la confidencialidad del paciente durante la atención.', referencia: 'Ley 29414', evidencia: 'Observación de consultorios' }
        ]
      },
      {
        titulo: 'Atención médica y registro en la HC',
        items: [
          { id: 'pr02-09', pregunta: 'La HC registra la anamnesis (síntomas y antecedentes).', referencia: 'PR-02 act. 9; NTS 139', evidencia: 'Muestra de HC' },
          { id: 'pr02-10', pregunta: 'La HC registra un examen físico acorde al motivo de consulta.', referencia: 'PR-02 act. 10; NTS 139', evidencia: 'Muestra de HC' },
          { id: 'pr02-11', pregunta: 'Se registra el diagnóstico presuntivo con su codificación CIE-10.', referencia: 'PR-02 act. 11; NTS 139', evidencia: 'Muestra de HC' },
          { id: 'pr02-12', pregunta: 'La prescripción es coherente con el diagnóstico, legible y lleva firma y sello del médico.', referencia: 'PR-02 act. 12', evidencia: 'Recetas y órdenes de la muestra' },
          { id: 'pr02-13', pregunta: 'Se obtiene el consentimiento informado cuando el procedimiento lo requiere.', referencia: 'Ley 29414; protocolos institucionales', evidencia: 'Formatos de consentimiento' },
          { id: 'pr02-14', pregunta: 'La HC queda completa, legible y con fecha, hora, firma y sello del profesional.', referencia: 'PR-02 act. 13; NTS 139', evidencia: 'Muestra de HC (auditoría de calidad de registro)' }
        ]
      }
    ]
  },
  {
    id: 'base-pr03',
    codigo: 'PR-03',
    nombre: 'Agendamiento de citas',
    area: 'Counter / Call Center ATC / App-Web',
    descripcion: 'Verifica la solicitud, la programación, la confirmación y la comunicación de citas presenciales y virtuales.',
    criterios: [
      'PR-03 Proceso de Agendamiento de Citas (v01)',
      'Ley N.° 29414 y D.S. N.° 027-2015-SA',
      'Ley N.° 29733, Protección de Datos Personales',
      'R.S. N.° 007-99/SUNAT, Reglamento de Comprobantes de Pago',
      'Políticas institucionales de canales, pagos y citas virtuales'
    ],
    secciones: [
      {
        titulo: 'Canales digitales (App/Web)',
        items: [
          { id: 'pr03-01', pregunta: 'La App/Web permite seleccionar el tipo de atención, la especialidad, el médico y el turno.', referencia: 'PR-03 act. 1–5', evidencia: 'Prueba de agendamiento en la App/Web' },
          { id: 'pr03-02', pregunta: 'El sistema confirma la reserva y la cita aparece en la aplicación.', referencia: 'PR-03 act. 6, 18', evidencia: 'Prueba en la App' },
          { id: 'pr03-03', pregunta: 'Se verifica el seguro y la condición de pago según la modalidad.', referencia: 'PR-03 act. 7', evidencia: 'Registros del sistema' },
          { id: 'pr03-04', pregunta: 'En citas virtuales con pago, el enlace funciona y el pago queda registrado.', referencia: 'PR-03 act. 8', evidencia: 'Muestra de citas virtuales pagadas' }
        ]
      },
      {
        titulo: 'Counter / Call Center',
        items: [
          { id: 'pr03-05', pregunta: 'Se solicita el documento de identidad y se verifica si el paciente es nuevo.', referencia: 'PR-03 act. 9', evidencia: 'Observación / llamada de prueba' },
          { id: 'pr03-06', pregunta: 'Para paciente nuevo, se registran los datos requeridos y se informa sobre el tratamiento de datos personales.', referencia: 'PR-03 act. 10; Ley 29733', evidencia: 'Registros de pacientes nuevos' },
          { id: 'pr03-07', pregunta: 'Los datos registrados se validan o corrigen.', referencia: 'PR-03 act. 11', evidencia: 'Muestra de registros' },
          { id: 'pr03-08', pregunta: 'Se verifica la agenda del médico y se informa la disponibilidad real.', referencia: 'PR-03 act. 12', evidencia: 'Agenda vs. lo informado' },
          { id: 'pr03-09', pregunta: 'La atención adicional se coordina con piso 2 cuando corresponde.', referencia: 'PR-03 act. 13', evidencia: 'Entrevista / registros de coordinación' },
          { id: 'pr03-10', pregunta: 'Se informan el monto, la cobertura y los métodos de pago antes de confirmar la cita.', referencia: 'PR-03 act. 14–15', evidencia: 'Llamada de prueba / observación' },
          { id: 'pr03-11', pregunta: 'La cita se registra en el sistema y el pago queda registrado cuando corresponde.', referencia: 'PR-03 act. 16', evidencia: 'Sistema de citas y caja' },
          { id: 'pr03-12', pregunta: 'Se informan al paciente la fecha, la hora, la especialidad, el médico, la modalidad, el lugar o enlace y las condiciones de pago.', referencia: 'PR-03 act. 17', evidencia: 'Llamada de prueba (cliente incógnito)' }
        ]
      },
      {
        titulo: 'Notificaciones',
        items: [
          { id: 'pr03-13', pregunta: 'Se envía una notificación automática de la cita al médico y al paciente.', referencia: 'PR-03 act. 18', evidencia: 'Registro de notificaciones' },
          { id: 'pr03-14', pregunta: 'Se envía un recordatorio automático 24 horas antes de la cita.', referencia: 'PR-03 act. 19', evidencia: 'Registro de recordatorios / prueba' }
        ]
      }
    ]
  },
  {
    id: 'base-pr04',
    codigo: 'PR-04',
    nombre: 'Cuadre de caja',
    area: 'Counter de Admisión / Tesorería',
    descripcion: 'Verifica la conciliación, la documentación, el tratamiento de diferencias y el cierre de caja.',
    criterios: [
      'PR-04 Proceso de Cuadre de Caja (v01)',
      'R.S. N.° 007-99/SUNAT, Reglamento de Comprobantes de Pago',
      'Políticas y manuales de caja, tesorería y control interno de la institución'
    ],
    secciones: [
      {
        titulo: 'Generación y conciliación',
        items: [
          { id: 'pr04-01', pregunta: 'Cada cajero ingresa al sistema de tesorería con su propio usuario autorizado (sin compartir credenciales).', referencia: 'PR-04 act. 1', evidencia: 'Logs de acceso / observación' },
          { id: 'pr04-02', pregunta: 'El detalle de movimientos se genera por soles, dólares y tipo de tarjeta o medio de pago.', referencia: 'PR-04 act. 2', evidencia: 'Reportes de caja' },
          { id: 'pr04-03', pregunta: 'Cada operación tiene su voucher o comprobante de sustento.', referencia: 'PR-04 act. 3', evidencia: 'Muestra de operaciones vs. vouchers' },
          { id: 'pr04-04', pregunta: 'Los importes de los medios de pago y del efectivo coinciden con el sistema.', referencia: 'PR-04 act. 4', evidencia: 'Cuadres de caja de la muestra' }
        ]
      },
      {
        titulo: 'Tratamiento de diferencias',
        items: [
          { id: 'pr04-05', pregunta: 'Las diferencias se analizan y su origen queda documentado.', referencia: 'PR-04 act. 5–6', evidencia: 'Registros de diferencias' },
          { id: 'pr04-06', pregunta: 'Las correcciones de registros en el sistema cuentan con autorización.', referencia: 'PR-04 act. 6', evidencia: 'Autorizaciones / logs del sistema' },
          { id: 'pr04-07', pregunta: 'Las diferencias recurrentes se registran como incidencia y se gestionan.', referencia: 'PR-04 act. 7', evidencia: 'Registro de incidencias' },
          { id: 'pr04-08', pregunta: 'Los faltantes asumidos institucionalmente tienen constancia del tratamiento aplicado.', referencia: 'PR-04 act. 7', evidencia: 'Actas / constancias' }
        ]
      },
      {
        titulo: 'Cierre y arqueo',
        items: [
          { id: 'pr04-09', pregunta: 'La documentación del cuadre está completa (sustentos, comprobantes y efectivo).', referencia: 'PR-04 act. 8', evidencia: 'Expedientes de cuadre' },
          { id: 'pr04-10', pregunta: 'El detalle de caja se imprime en tres ejemplares, firmado y sellado.', referencia: 'PR-04 act. 9–10', evidencia: 'Expedientes de cuadre' },
          { id: 'pr04-11', pregunta: 'Tesorería verifica la conformidad del cierre.', referencia: 'PR-04 act. 11', evidencia: 'Visto bueno de Tesorería' },
          { id: 'pr04-12', pregunta: 'Los cierres no conformes se regularizan junto con la Coordinadora de Admisión.', referencia: 'PR-04 act. 12', evidencia: 'Registros de regularización' },
          { id: 'pr04-13', pregunta: 'Tesorería realiza el arqueo de caja y este coincide con los registros.', referencia: 'PR-04 act. 13', evidencia: 'Actas de arqueo' },
          { id: 'pr04-14', pregunta: 'El arqueo sorpresa hecho por el auditor coincide con el sistema.', referencia: 'Control interno', evidencia: 'Acta de arqueo del auditor' }
        ]
      }
    ]
  },
  {
    id: 'base-doc',
    codigo: 'DOC',
    nombre: 'Revisión documental de procedimientos',
    area: 'Gestión de la calidad',
    descripcion: 'Lista genérica para evaluar si un procedimiento escrito está bien elaborado. Sirve para cualquier proceso.',
    criterios: [
      'ISO 9001:2015, numerales 4.4 y 7.5 (Información documentada)',
      'Norma Técnica N.° 001-2018-SGP (referencial)'
    ],
    secciones: [
      {
        titulo: 'Control del documento',
        items: [
          { id: 'doc-01', pregunta: 'El documento tiene código, versión y fechas de aprobación y vigencia coherentes.', referencia: 'ISO 9001 7.5.2', evidencia: 'Carátula del documento' },
          { id: 'doc-02', pregunta: 'Consta quién lo elaboró, revisó y aprobó, con nombres completos y firmas.', referencia: 'ISO 9001 7.5.2', evidencia: 'Carátula del documento' },
          { id: 'doc-03', pregunta: 'Tiene un control de cambios o historial de versiones.', referencia: 'ISO 9001 7.5.3', evidencia: 'Documento' },
          { id: 'doc-04', pregunta: 'Está difundido y el personal puede acceder a la versión vigente.', referencia: 'ISO 9001 7.5.3', evidencia: 'Entrevista / repositorio documental' }
        ]
      },
      {
        titulo: 'Contenido',
        items: [
          { id: 'doc-05', pregunta: 'El objetivo y el alcance son claros y coherentes con las actividades descritas.', referencia: 'ISO 9001 4.4', evidencia: 'Documento' },
          { id: 'doc-06', pregunta: 'La base legal está vigente y es pertinente.', referencia: 'ISO 9001 4.2', evidencia: 'Documento vs. normativa vigente' },
          { id: 'doc-07', pregunta: 'Las definiciones cubren los términos y siglas usados.', referencia: 'Buena práctica', evidencia: 'Documento' },
          { id: 'doc-08', pregunta: 'El diagrama de flujo coincide con la descripción de actividades.', referencia: 'ISO 9001 4.4', evidencia: 'Diagrama vs. tabla de actividades' },
          { id: 'doc-09', pregunta: 'Cada actividad tiene un responsable definido.', referencia: 'ISO 9001 5.3', evidencia: 'Documento' },
          { id: 'doc-10', pregunta: 'Se definen los registros o formatos que genera el proceso.', referencia: 'ISO 9001 7.5', evidencia: 'Documento' },
          { id: 'doc-11', pregunta: 'Se definen indicadores para medir el desempeño del proceso.', referencia: 'ISO 9001 4.4 c), 9.1', evidencia: 'Documento' },
          { id: 'doc-12', pregunta: 'El documento no se superpone ni contradice a otros procedimientos.', referencia: 'ISO 9001 4.4', evidencia: 'Comparación con procedimientos relacionados' }
        ]
      }
    ]
  }
];
