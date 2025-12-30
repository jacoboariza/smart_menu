import { Globe, Leaf, MapPin, Phone, Utensils, Zap } from 'lucide-react'

export default function PreviewTab({
  restaurantName,
  restaurantImage,
  restaurantCuisine,
  restaurantPhone,
  restaurantUrl,
  restaurantStreet,
  restaurantCity,
  restaurantPostalCode,
  restaurantCountry,
  sections,
  currencies,
}) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white shadow-lg overflow-hidden">
        {restaurantImage && (
          <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden relative">
            <img
              src={restaurantImage}
              alt={restaurantName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div
          className={`bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-4 text-white ${
            restaurantImage ? '' : 'pt-6'
          }`}
        >
          <div className="text-xl font-bold">{restaurantName || 'Mi Restaurante'}</div>
          {restaurantCuisine && <div className="text-sm text-indigo-100 mt-0.5">{restaurantCuisine}</div>}

          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {restaurantPhone && (
              <a
                href={`tel:${restaurantPhone}`}
                className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 hover:bg-white/30 transition-colors"
              >
                <Phone className="h-3 w-3" />
                {restaurantPhone}
              </a>
            )}
            {restaurantUrl && (
              <a
                href={restaurantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 hover:bg-white/30 transition-colors"
              >
                <Globe className="h-3 w-3" />
                Web
              </a>
            )}
          </div>

          {(restaurantStreet || restaurantCity) && (
            <div className="mt-3 flex items-start gap-1.5 text-xs text-indigo-100">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {[restaurantStreet, restaurantCity, restaurantPostalCode, restaurantCountry]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-5">
          {sections.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-10">No hay secciones todavía.</div>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id}>
                  <div className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
                    {section.name}
                  </div>
                  <div className="mt-3 space-y-4">
                    {section.items.length === 0 ? (
                      <div className="text-xs text-slate-400">Sin platos.</div>
                    ) : (
                      section.items.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border border-slate-200 overflow-hidden ${
                            item.isAvailable ? 'bg-white' : 'bg-slate-50'
                          }`}
                        >
                          {item.image && (
                            <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className={`flex-1 ${item.isAvailable ? '' : 'opacity-70'}`}>
                                <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                                <div className="mt-1 text-xs text-slate-600">{item.description}</div>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {item.calories && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                                      <Zap className="h-3 w-3" /> {item.calories} kcal
                                    </span>
                                  )}
                                  {item.isVegan && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                      <Leaf className="h-3 w-3" /> Vegano
                                    </span>
                                  )}
                                  {item.isGlutenFree && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                      Sin Gluten
                                    </span>
                                  )}
                                  {!item.isAvailable && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                      No disponible
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`text-base font-bold text-indigo-600 ${
                                  item.isAvailable ? '' : 'opacity-70'
                                }`}
                              >
                                {Number(item.price || 0).toFixed(2)}{' '}
                                {currencies.find((c) => c.code === (item.currency || 'EUR'))?.symbol || '€'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
          <div className="text-[10px] text-slate-400">Carta digital con datos semánticos</div>
        </div>
      </div>
    </div>
  )
}
