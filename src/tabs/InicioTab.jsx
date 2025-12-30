import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Lightbulb,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react'

export default function InicioTab({ onStart }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Web Semántica para Restaurantes
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Haz tu menú{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            inteligente
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Genera datos estructurados JSON-LD que Google, Siri y Alexa pueden entender. Mejora tu SEO y
          visibilidad sin tocar código.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Utensils className="h-6 w-6 text-white" />
          </div>
          <div className="text-xs font-bold text-indigo-600 mb-2">PASO 1</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Crea tu carta</h3>
          <p className="text-sm text-slate-600">
            Añade secciones y platos con precios, descripciones y etiquetas dietéticas.
          </p>
        </div>

        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-xs font-bold text-emerald-600 mb-2">PASO 2</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Generación automática</h3>
          <p className="text-sm text-slate-600">
            El JSON-LD se genera en tiempo real siguiendo el estándar Schema.org.
          </p>
        </div>

        <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div className="text-xs font-bold text-amber-600 mb-2">PASO 3</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Publica en tu web</h3>
          <p className="text-sm text-slate-600">
            Copia el código y pégalo en el &lt;head&gt; de tu página. ¡Listo!
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">¿Por qué datos estructurados?</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Los datos estructurados permiten que los motores de búsqueda entiendan mejor tu contenido.
              Google puede mostrar tu menú directamente en los resultados de búsqueda con{' '}
              <strong className="text-white">rich snippets</strong>, aumentando tu visibilidad y clics.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> SEO mejorado
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Compatible con asistentes de voz
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Estándar W3C
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          Comenzar ahora
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
