import { CheckCircle2, Code, Copy, Download, Globe, Lightbulb, Utensils } from 'lucide-react'

export default function JsonTab({
  copied,
  copyToClipboard,
  downloadJson,
  downloadTurtle,
  jsonLdString,
  sections,
  totalItems,
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Datos Web 3.0</h2>
          <p className="text-sm text-slate-500">Código JSON-LD listo para usar en tu web</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sincronizado W3C
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">JSON-LD generado</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={downloadJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </button>
              <button
                type="button"
                onClick={downloadTurtle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar TTL
              </button>
            </div>
          </div>
          <pre className="overflow-auto p-4 text-xs text-slate-100 bg-slate-900 max-h-[400px]">
            <code>{jsonLdString}</code>
          </pre>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Cómo usar este código
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Copia el código</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Haz clic en "Copiar" o descarga el archivo JSON.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Abre tu archivo HTML</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Localiza la etiqueta{' '}
                    <code className="px-1 py-0.5 bg-white rounded text-indigo-600">&lt;head&gt;</code> de tu
                    página web.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Pega el script</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Inserta el código dentro de{' '}
                    <code className="px-1 py-0.5 bg-white rounded text-indigo-600">
                      &lt;script type="application/ld+json"&gt;
                    </code>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">¡Listo!</p>
                  <p className="text-xs text-slate-600 mt-0.5">Google indexará tu menú automáticamente.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Ejemplo de integración</h4>
            <pre className="overflow-auto p-3 rounded-lg bg-slate-800 text-xs text-slate-200">
              <code>{`<!DOCTYPE html>
<html>
<head>
  <title>Mi Restaurante</title>
  
  <!-- Pega aquí el JSON-LD -->
  <script type="application/ld+json">
    { ... tu JSON-LD ... }
  </script>
  
</head>
<body>...</body>
</html>`}</code>
            </pre>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Consejo Pro</p>
                <p className="text-xs text-amber-800 mt-1">
                  Usa la herramienta{' '}
                  <a
                    href="https://search.google.com/test/rich-results"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Rich Results Test
                  </a>{' '}
                  de Google para validar que tu código es correcto.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Code className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{sections.length}</div>
            <div className="text-xs text-slate-500">Secciones</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Utensils className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalItems}</div>
            <div className="text-xs text-slate-500">Platos totales</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
            <Globe className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{jsonLdString.length}</div>
            <div className="text-xs text-slate-500">Caracteres JSON</div>
          </div>
        </div>
      </div>
    </div>
  )
}
