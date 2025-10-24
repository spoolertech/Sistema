# Sistema de Gestión de Soporte Técnico

Sistema web completo para la gestión de clientes, trabajos, facturación y más para tu negocio de soporte técnico.

## Características Principales

- **Multi-tenant**: Cada usuario tiene su propia oficina/empresa con datos separados
- **Clientes Abonados**: Gestión completa de clientes con abonos mensuales, control de horas, ajustes por IPC
- **Clientes Eventuales**: Registro de clientes que contratan servicios por única vez
- **Trabajos y Servicios**: Seguimiento de todos los trabajos realizados con estados
- **Dashboard**: Resumen visual de tu negocio en tiempo real
- **Responsive**: Funciona perfecto en celular, tablet y PC
- **Acceso desde cualquier lugar**: Sistema en la nube, sin necesidad de dejar PCs encendidas

## Tecnologías

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Despliegue**: Tu hosting actual (archivos estáticos)

## Estado del Desarrollo

### ✅ Módulos 100% Completados

**Autenticación y Seguridad**
- Sistema de login y registro
- Multi-tenant con datos separados por usuario
- Row Level Security (RLS) en todas las tablas

**Dashboard**
- Estadísticas en tiempo real
- Clientes activos y eventuales
- Trabajos pendientes
- Facturas impagas
- Facturación mensual
- Alertas de ajustes IPC

**Gestión de Clientes Abonados**
- Alta, baja y modificación
- Control de horas incluidas vs consumidas
- Períodos de ajuste IPC configurables
- Seguimiento de valores y actualizaciones
- Filtros por estado (activo/inactivo/moroso)

**Gestión de Clientes Eventuales**
- Registro de clientes por única vez
- Historial de trabajos realizados

**Trabajos y Servicios**
- Registro completo de servicios
- Estados: pendiente, en proceso, terminado, facturado, cobrado
- Tipos: abono, eventual, urgencia, remoto, presencial
- Control de horas y valores
- Filtros y búsquedas

**Facturación Completa**
- Registro de facturas con items detallados
- Cálculo automático de subtotal, IVA y total
- Estados: emitida, enviada, cobrada, vencida
- Vinculación con clientes
- Carga de PDF de facturas
- Marcado de facturas como cobradas
- Totales y estadísticas de facturación
- Generación automática de movimientos en cuenta corriente

**Cuentas Corrientes**
- Vista detallada por cliente
- Movimientos: facturas, pagos, notas de crédito/débito
- Saldo actual con indicador (debe/haber)
- Totales facturados y cobrados
- Historial completo ordenado por fecha
- Tabla tipo libro contable (debe/haber/saldo)

**Ajustes por IPC**
- Detección automática de clientes que necesitan ajuste
- Cálculo de nuevos valores según % configurado
- Períodos: trimestral, cuatrimestral, semestral
- Historial de ajustes por cliente
- Actualización automática de fechas de próximo ajuste
- IPC sugerido por mes del año

**Agenda y Calendario**
- Registro de eventos por fecha
- Tipos: visitas, llamadas, reuniones
- Estados: pendiente, confirmado, realizado, cancelado
- Vinculación con clientes
- Filtro por fecha
- Marcado rápido de estados

### 🚀 Mejoras Futuras Opcionales
- Integración con AFIP para facturación electrónica
- Sincronización real con Google Calendar
- WhatsApp para notificaciones automáticas
- Portal del cliente (acceso limitado)
- Control de stock de insumos
- Gestión de gastos operativos
- Reportes PDF descargables
- Gráficos y estadísticas avanzadas

## Instalación y Desarrollo Local

### Prerrequisitos
- Node.js 18 o superior
- Cuenta de Supabase (gratuita)

### Pasos

1. **Clonar el proyecto**
```bash
git clone [tu-repositorio]
cd proyecto
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

El archivo `.env` ya está configurado con las credenciales de Supabase.

4. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

El sistema estará disponible en `http://localhost:5173`

## Despliegue a Producción

### Paso 1: Compilar el Proyecto

```bash
npm run build
```

Esto genera la carpeta `dist` con todos los archivos estáticos.

### Paso 2: Subir a tu Hosting

#### Opción A: Por FTP/cPanel
1. Abrí tu cliente FTP (FileZilla, WinSCP, etc.)
2. Conectate a tu hosting
3. Navegá a la carpeta `public_html` o `www` (o crea un subdirectorio)
4. Subí TODO el contenido de la carpeta `dist` (no la carpeta dist en sí, sino su contenido)

#### Opción B: Por cPanel File Manager
1. Ingresá a cPanel
2. File Manager → `public_html`
3. Upload → Seleccioná todos los archivos de `dist`
4. Subí los archivos

### Paso 3: Configurar el Dominio

Si usás un subdominio (ej: `gestion.tudominio.com`):

1. En cPanel → Subdominios
2. Crear subdominio `gestion`
3. Apuntar a la carpeta donde subiste los archivos

### Paso 4: Listo!

Accedé a tu dominio y el sistema estará funcionando.

## Uso del Sistema

### Primer Uso

1. **Registrate**: Creá tu cuenta con email y contraseña
2. **Ingresá el nombre de tu empresa**: Esto crea tu tenant/espacio de trabajo
3. **Ya podés empezar**: El sistema te llevará al dashboard

### Gestión de Clientes Abonados

- **Nuevo Cliente**: Click en "Nuevo Cliente"
- Completá los datos (nombre, CUIT, email, teléfono)
- Configurá el abono: valor, horas incluidas, tipo (mensual/bimestral/etc)
- Elegí el período de ajuste IPC (trimestral/cuatrimestral/semestral)
- Guardá

### Gestión de Trabajos

- **Nuevo Trabajo**: Click en "Nuevo Trabajo"
- Seleccioná el cliente (abonado o eventual)
- Describí el servicio realizado
- Ingresá horas y valor
- Marcá el estado (pendiente/en proceso/terminado/facturado/cobrado)

### Dashboard

El dashboard te muestra:
- Clientes activos y eventuales
- Trabajos pendientes
- Facturas impagas
- Facturación del mes
- Clientes que necesitan ajuste IPC
- Alertas de tareas importantes

### Gestión de Facturas

- **Nueva Factura**: Click en "Nueva Factura"
- Seleccioná el cliente
- Agregá items con descripción, cantidad y precio
- El sistema calcula automáticamente subtotal, IVA y total
- Guardá el número de factura de AFIP
- Podés cargar la URL del PDF
- La factura genera automáticamente un movimiento en la cuenta corriente
- Marcala como cobrada cuando recibas el pago

### Cuentas Corrientes

- Seleccioná un cliente
- Ves todos sus movimientos (facturas y pagos)
- Saldo actual claramente identificado
- Totales facturados vs cobrados
- Historial completo tipo libro contable

### Ajustes por IPC

- El sistema detecta automáticamente clientes que necesitan ajuste
- Configurá el % de IPC a aplicar (sugerido por mes)
- Visualizá el cálculo: valor actual → incremento → nuevo valor
- Aplicá el ajuste con un click
- El sistema actualiza el valor y las fechas automáticamente
- Queda registrado en el historial

### Agenda

- Seleccioná una fecha
- Creá eventos (visitas, llamadas, reuniones)
- Vinculá con clientes
- Marcá estados (pendiente, confirmado, realizado)
- Vista clara de tus compromisos del día

## Estructura de la Base de Datos

### Tablas Principales

- `tenants`: Empresas/oficinas (multi-tenant)
- `profiles`: Perfiles de usuarios
- `clients`: Clientes con abono
- `occasional_clients`: Clientes eventuales
- `services`: Trabajos y servicios realizados
- `invoices`: Facturas emitidas
- `account_movements`: Movimientos de cuenta corriente
- `calendar_events`: Eventos de agenda
- `ipc_history`: Historial de IPC
- `value_adjustments`: Ajustes de valores

### Seguridad

Todas las tablas tienen:
- Row Level Security (RLS) habilitado
- Políticas restrictivas por tenant
- Solo usuarios autenticados pueden acceder
- Cada usuario solo ve sus propios datos

## Costos

- **Supabase Free Tier**: $0/mes (incluye)
  - 500 MB de base de datos
  - 1 GB de storage
  - 500K API requests/mes
  - Más que suficiente para uso personal

- **Tu Hosting**: Ya lo tenés pago

**Total: $0 adicional**

## Soporte y Mejoras Futuras

El sistema está diseñado para crecer. Podés agregar:
- Integración con AFIP para facturación electrónica
- WhatsApp para notificaciones
- Portal del cliente
- Control de stock de insumos
- Gestión de gastos
- Y mucho más...

## Funcionalidades Destacadas

### Control Automático de Horas
- El sistema te avisa cuando un cliente abonado supera sus horas incluidas
- Podés ver en tiempo real las horas consumidas vs incluidas

### Seguimiento de Trabajos
- Desde "pendiente" hasta "cobrado"
- Vinculación con facturas
- Historial completo por cliente

### Facturación Integrada
- Items detallados por factura
- Cálculo automático de IVA
- Generación automática de cuenta corriente
- Un click para marcar como cobrada

### Cuenta Corriente Automática
- Se actualiza automáticamente con cada factura
- Se actualiza automáticamente con cada pago
- Saldo siempre al día
- Vista tipo libro contable profesional

### Ajustes IPC Inteligentes
- Detecta automáticamente fechas vencidas
- Calcula el nuevo valor sugerido
- Actualiza todo con un click
- Historial completo de ajustes

### Multi-dispositivo
- Funciona en PC, notebook, tablet y celular
- Diseño responsive y moderno
- Datos sincronizados en tiempo real
- Sin instalaciones, solo navegador web

## Notas Importantes

- **TODOS los módulos están 100% funcionales y listos para usar**
- El sistema está completo y en producción
- Todas las credenciales de Supabase ya están configuradas
- Build exitoso generado en la carpeta `dist`
- Listo para subir a tu hosting y empezar a usar

## Actualizaciones

Cuando hagas cambios al código:

1. Ejecutá `npm run build`
2. Subí el contenido de `dist` por FTP
3. Listo, cambios en producción

No necesitás reiniciar servicios ni configurar nada más.
