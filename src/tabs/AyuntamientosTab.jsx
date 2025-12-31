import {
  Database,
  BarChart3,
  Globe,
  Users,
  FileText,
  Share2,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react'

const PRODUCTOS = [
  {
    titulo: 'Catálogo municipal de restauración',
    descripcion:
      'Base de datos estructurada y oficial de restaurantes del municipio, con menús, horarios y alérgenos, reutilizable por cualquier servicio digital.',
    tipo: 'Activo de datos público',
    icon: Database,
  },
  {
    titulo: 'Panel de ocupación agregada',
    descripcion:
      'Información agregada y anónima sobre niveles de ocupación de la restauración, útil para gestión de flujos y planificación turística.',
    tipo: 'Herramienta de gestión',
    icon: BarChart3,
  },
  {
    titulo: 'API municipal de datos de restauración',
    descripcion:
      'Interfaz técnica controlada que permite a aplicaciones municipales o externas consumir los datos bajo políticas definidas por el ayuntamiento.',
    tipo: 'Infraestructura digital',
    icon: Globe,
  },
  {
    titulo: 'Servicios digitales para el ciudadano',
    descripcion:
      'Casos de uso listos para el ciudadano: restaurantes abiertos, opciones sin gluten, recomendaciones por zona u horario.',
    tipo: 'Servicios al ciudadano',
    icon: Users,
  },
  {
    titulo: 'Informe de impacto y uso',
    descripcion:
      'Informe periódico que muestra uso de los datos, impacto en visibilidad y apoyo a la toma de decisiones.',
    tipo: 'Evidencia y rendición de cuentas',
    icon: FileText,
  },
  {
    titulo: 'Modelo replicable alineado con DTI y Europa',
    descripcion:
      'Modelo documentado de gobernanza e interoperabilidad de datos, exportable a otros municipios.',
    tipo: 'Activo estratégico',
    icon: Share2,
  },
]

const BENEFICIOS = [
  'Disponer de un dato oficial y reutilizable sobre la restauración local',
  'Reducir dependencia de plataformas privadas',
  'Mejorar la gestión de flujos turísticos y eventos',
  'Facilitar la inclusión (alérgenos, accesibilidad)',
  'Justificar proyectos financiados con fondos europeos',
  'Alinear el municipio con el modelo DTI y los Espacios Europeos de Datos',
]

const NO_ES = [
  'No es una app comercial',
  'No gestiona datos personales',
  'No sustituye a los restaurantes',
  'No obliga a usar proveedores privados',
]

export default function AyuntamientosTab() {
  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
          <Building2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Para Ayuntamientos</h1>
          <p className="text-slate-500 text-sm">Productos y beneficios para entes públicos</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-700 leading-relaxed">
          Esta plataforma permite a un ayuntamiento{' '}
          <strong>disponer de datos estructurados, reutilizables y bajo control público</strong> sobre
          la restauración del municipio, alineados con los principios de los{' '}
          <em>Destinos Turísticos Inteligentes</em> y los{' '}
          <em>Espacios Europeos de Datos</em>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Productos que recibe el Ayuntamiento</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTOS.map((prod) => {
            const Icon = prod.icon
            return (
              <div
                key={prod.titulo}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{prod.titulo}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">{prod.descripcion}</p>
                <div className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 self-start">
                  {prod.tipo}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Beneficios prácticos para el Ayuntamiento</h2>
        <ul className="space-y-2">
          {BENEFICIOS.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700 text-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Qué NO es esta plataforma</h2>
        <ul className="space-y-2">
          {NO_ES.map((n, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700 text-sm">
              <XCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 p-6 shadow-sm">
        <p className="text-slate-700 leading-relaxed">
          Esta plataforma no es un software cerrado, sino una{' '}
          <strong>infraestructura de datos públicos</strong> que permite al ayuntamiento crear valor
          digital sostenible a partir de la información de su restauración.
        </p>
      </section>
    </div>
  )
}
