/*
 * Configuración de la organización.
 *
 * Si llenas estos datos aquí, todos los auditores que abran el enlace tendrán
 * OneDrive listo sin configurar nada. Cada auditor también puede configurarlo
 * desde la sección "OneDrive" del sistema (se guarda solo en su navegador).
 */
window.AUDITA_CONFIG = {
  onedrive: {
    // ID de aplicación (cliente) que te da Microsoft Entra al registrar la app.
    clientId: '',
    // "common" para cualquier cuenta, o el ID de directorio (inquilino) de la clínica.
    tenant: 'common',
    // Carpeta base donde se guardan las auditorías.
    carpeta: 'Auditorías',
    // Opcional: sitio de SharePoint para guardar en una biblioteca compartida del área de Calidad.
    // Ejemplo: 'detecta.sharepoint.com/sites/Calidad'. Vacío = OneDrive personal de cada auditor.
    sharepoint: ''
  }
};
