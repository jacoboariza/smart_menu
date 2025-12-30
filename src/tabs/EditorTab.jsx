import {
  Cookie,
  Droplets,
  Dumbbell,
  Globe,
  Image,
  Leaf,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Salad,
  Utensils,
  Video,
  X,
  Zap,
} from 'lucide-react'

export default function EditorTab({
  restaurantName,
  setRestaurantName,
  restaurantCuisine,
  setRestaurantCuisine,
  restaurantPhone,
  setRestaurantPhone,
  restaurantUrl,
  setRestaurantUrl,
  handleAutofillFromWebsite,
  webAutofillLoading,
  webAutofillError,
  normalizeWebsiteUrl,
  restaurantLicense,
  setRestaurantLicense,
  dataSharingScope,
  setDataSharingScope,
  restaurantImage,
  setRestaurantImage,
  restaurantStreet,
  setRestaurantStreet,
  restaurantCity,
  setRestaurantCity,
  restaurantPostalCode,
  setRestaurantPostalCode,
  restaurantCountry,
  setRestaurantCountry,
  newSectionName,
  setNewSectionName,
  addSection,
  sections,
  renameSection,
  addItem,
  deleteSection,
  updateItem,
  deleteItem,
  currencies,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Editor de Carta</h2>
          <p className="text-sm text-slate-500">
            Crea y edita tu menú. Los cambios se reflejan en tiempo real.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
          <Utensils className="h-4 w-4 text-indigo-600" />
          Información del Restaurante
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Nombre del Restaurante"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Cocina</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantCuisine}
              onChange={(e) => setRestaurantCuisine(e.target.value)}
              placeholder="Ej: Mediterránea, Italiana, Japonesa..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Phone className="h-3 w-3 inline mr-1" />Teléfono
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value)}
              placeholder="+34 912 345 678"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Globe className="h-3 w-3 inline mr-1" />URL Web
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={restaurantUrl}
                onChange={(e) => setRestaurantUrl(e.target.value)}
                placeholder="https://www.mirestaurante.com"
              />
              <button
                type="button"
                onClick={handleAutofillFromWebsite}
                disabled={webAutofillLoading || !normalizeWebsiteUrl(restaurantUrl)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                title="Intentar completar datos desde la web (JSON-LD / meta tags)"
              >
                {webAutofillLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Extraer
              </button>
            </div>
            {webAutofillError && <div className="mt-2 text-xs text-red-600">{webAutofillError}</div>}
            {!webAutofillError && (
              <div className="mt-2 text-[11px] text-slate-500">
                Se intentará leer datos públicos (JSON-LD / meta). No se almacena la información.
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Licencia de los datos</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantLicense}
              onChange={(e) => setRestaurantLicense(e.target.value)}
              placeholder="https://creativecommons.org/licenses/by/4.0/"
            />
            <p className="text-[11px] text-slate-500 mt-1">Incluye la URL de la licencia (ej. CC BY 4.0).</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ámbito de compartición</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={dataSharingScope}
              onChange={(e) => setDataSharingScope(e.target.value)}
            >
              <option value="public">Público</option>
              <option value="partners">Partners</option>
              <option value="private">Privado</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Controla la difusión del menú en espacios de datos.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              <Image className="h-3 w-3 inline mr-1" />URL Imagen de Portada
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={restaurantImage}
              onChange={(e) => setRestaurantImage(e.target.value)}
              placeholder="https://ejemplo.com/imagen-restaurante.jpg"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-3">
            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
            Dirección
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Calle</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={restaurantStreet}
                onChange={(e) => setRestaurantStreet(e.target.value)}
                placeholder="Calle Principal, 123"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ciudad</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={restaurantCity}
                onChange={(e) => setRestaurantCity(e.target.value)}
                placeholder="Madrid"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CP</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={restaurantPostalCode}
                  onChange={(e) => setRestaurantPostalCode(e.target.value)}
                  placeholder="28001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">País</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={restaurantCountry}
                  onChange={(e) => setRestaurantCountry(e.target.value)}
                  placeholder="ES"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-800">Secciones</div>
            <div className="text-xs text-slate-500">Crea categorías como Entrantes, Principales, Postres…</div>
          </div>
          <div className="flex gap-2">
            <input
              className="w-full sm:w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Nueva sección"
            />
            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {sections.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Crea tu primera sección para empezar.
          </div>
        )}

        {sections.map((section) => (
          <section key={section.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                className="w-full sm:w-[420px] text-lg font-semibold text-slate-900 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                value={section.name}
                onChange={(e) => renameSection(section.id, e.target.value)}
                placeholder="Nombre de sección"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItem(section.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Añadir plato
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(section.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Eliminar sección
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {section.items.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  Sin platos todavía.
                </div>
              )}

              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border border-slate-200 p-4 transition-opacity ${
                    item.isAvailable ? 'bg-white' : 'bg-slate-50 opacity-70'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <input
                          className="w-full sm:flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200"
                          value={item.name}
                          onChange={(e) => updateItem(section.id, item.id, { name: e.target.value })}
                          placeholder="Nombre del plato"
                        />

                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.currency || 'EUR'}
                            onChange={(e) => updateItem(section.id, item.id, { currency: e.target.value })}
                          >
                            {currencies.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(section.id, item.id, {
                                price: Number(e.target.value || 0),
                              })
                            }
                          />
                          <span className="text-sm text-slate-600">
                            {currencies.find((c) => c.code === (item.currency || 'EUR'))?.symbol || '€'}
                          </span>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                        value={item.description}
                        onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                        placeholder="Descripción detallada"
                      />

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.image || ''}
                            onChange={(e) => updateItem(section.id, item.id, { image: e.target.value })}
                            placeholder="URL imagen del plato"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.video || ''}
                            onChange={(e) => updateItem(section.id, item.id, { video: e.target.value })}
                            placeholder="URL video corto (mp4/webm/Reel)"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Salad className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                            value={item.ingredients || ''}
                            onChange={(e) => updateItem(section.id, item.id, { ingredients: e.target.value })}
                            placeholder="Ingredientes separados por comas"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.calories || ''}
                              onChange={(e) => updateItem(section.id, item.id, { calories: e.target.value })}
                              placeholder="kcal"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.protein || ''}
                              onChange={(e) => updateItem(section.id, item.id, { protein: e.target.value })}
                              placeholder="prot g"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Cookie className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.carbs || ''}
                              onChange={(e) => updateItem(section.id, item.id, { carbs: e.target.value })}
                              placeholder="carbs g"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Droplets className="h-4 w-4 text-pink-500 flex-shrink-0" />
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-indigo-200"
                              value={item.fat || ''}
                              onChange={(e) => updateItem(section.id, item.id, { fat: e.target.value })}
                              placeholder="grasa g"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                            checked={item.isVegan}
                            onChange={(e) => updateItem(section.id, item.id, { isVegan: e.target.checked })}
                          />
                          <span className="inline-flex items-center gap-1">
                            <Leaf className="h-4 w-4 text-emerald-600" />
                            Vegano
                          </span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-200"
                            checked={item.isVegetarian}
                            onChange={(e) => updateItem(section.id, item.id, { isVegetarian: e.target.checked })}
                          />
                          Vegetariano
                        </label>

                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-200"
                            checked={item.isGlutenFree}
                            onChange={(e) => updateItem(section.id, item.id, { isGlutenFree: e.target.checked })}
                          />
                          Sin Gluten
                        </label>

                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                            checked={item.isAvailable}
                            onChange={(e) => updateItem(section.id, item.id, { isAvailable: e.target.checked })}
                          />
                          Disponible
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => deleteItem(section.id, item.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Eliminar plato
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
