import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Code, Copy, Download, Eye, FileText, Globe, Image, Leaf, Lightbulb, Link, Loader2, MapPin, Phone, Plus, Rocket, Sparkles, Upload, Utensils, X, Zap } from 'lucide-react'
import { useRef } from 'react'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const CURRENCIES = [{ code: 'EUR', symbol: '€' }]

export default function App() {
  const [activeTab, setActiveTab] = useState('inicio')
  const [copied, setCopied] = useState(false)
  const [restaurantName, setRestaurantName] = useState('Mi Restaurante')
  const [restaurantImage, setRestaurantImage] = useState('')
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [restaurantUrl, setRestaurantUrl] = useState('')
  const [restaurantCuisine, setRestaurantCuisine] = useState('')
  const [restaurantStreet, setRestaurantStreet] = useState('')
  const [restaurantCity, setRestaurantCity] = useState('')
  const [restaurantPostalCode, setRestaurantPostalCode] = useState('')
  const [restaurantCountry, setRestaurantCountry] = useState('ES')
  const [sections, setSections] = useState([])
  const [newSectionName, setNewSectionName] = useState('')
  const fileInputRef = useRef(null)
  const pdfFileInputRef = useRef(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [useGemini, setUseGemini] = useState(true)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showLegalModal, setShowLegalModal] = useState(false)
  const [legalTab, setLegalTab] = useState('privacy')
  const [webAutofillLoading, setWebAutofillLoading] = useState(false)
  const [webAutofillError, setWebAutofillError] = useState('')

  function handleLoadJson(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result)
        
        if (json.name) setRestaurantName(json.name)
        if (json.image) setRestaurantImage(json.image)
        if (json.telephone) setRestaurantPhone(json.telephone)
        if (json.url) setRestaurantUrl(json.url)
        if (json.servesCuisine) setRestaurantCuisine(json.servesCuisine)
        if (json.address) {
          setRestaurantStreet(json.address.streetAddress || '')
          setRestaurantCity(json.address.addressLocality || '')
          setRestaurantPostalCode(json.address.postalCode || '')
          setRestaurantCountry(json.address.addressCountry || 'ES')
        }

        const menuSections = json.hasMenu?.hasMenuSection || []
        const loadedSections = menuSections.map((sec) => ({
          id: uid(),
          name: sec.name || 'Sin nombre',
          items: (sec.hasMenuItem || []).map((item) => {
            const diets = item.suitableForDiet || []
            return {
              id: uid(),
              name: item.name || '',
              description: item.description || '',
              image: item.image || '',
              calories: item.nutrition?.calories?.replace(' calories', '') || '',
              price: Number(item.offers?.price) || 0,
              currency: item.offers?.priceCurrency || 'EUR',
              isVegan: diets.includes('https://schema.org/VeganDiet'),
              isGlutenFree: diets.includes('https://schema.org/GlutenFreeDiet'),
              isAvailable: item.offers?.availability !== 'https://schema.org/OutOfStock',
            }
          }),
        }))

        setSections(loadedSections)
        setActiveTab('editor')
      } catch (err) {
        alert('Error al cargar el archivo JSON. Verifica que el formato sea correcto.')
        console.error(err)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function extractTextFromPdf(arrayBuffer) {
    // Cargar pdf.js dinámicamente desde CDN
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
    
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText
  }

  function parseMenuFromText(text) {
    console.log('Texto completo del PDF:', text)
    
    // Limpiar y dividir el texto en tokens (el PDF puede tener formato fragmentado)
    const cleanText = text.replace(/\s+/g, ' ').trim()
    const parsedSections = []
    let currentSection = null
    
    // Patrones de precio más flexibles
    const pricePatterns = [
      /(\d+[.,]\d{2})\s*€/g,
      /€\s*(\d+[.,]\d{2})/g,
      /(\d+[.,]\d{2})\s*euros?/gi,
      /(\d{1,2}[.,]\d{2})(?=\s|$)/g,
    ]
    
    const sectionKeywords = ['entrantes', 'primeros', 'segundos', 'principales', 'postres', 'bebidas', 'vinos', 'ensaladas', 'carnes', 'pescados', 'pastas', 'pizzas', 'antipasti', 'dolci', 'aperitivos', 'sopas', 'arroces', 'mariscos', 'hamburguesas', 'sandwiches', 'cafés', 'licores', 'cócteles', 'starters', 'mains', 'desserts', 'drinks', 'menu', 'carta', 'specialties', 'especialidades', 'platos', 'dishes']
    
    // Dividir por líneas o por patrones de sección
    const segments = text.split(/(?=\b(?:entrantes|primeros|segundos|principales|postres|bebidas|pastas|pizzas|antipasti|dolci|ensaladas|carnes|pescados)\b)/gi)
    
    for (const segment of segments) {
      const lines = segment.split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 2)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Detectar secciones
        const isLikelySection = sectionKeywords.some(kw => 
          line.toLowerCase().startsWith(kw) || line.toLowerCase() === kw
        ) && line.length < 40
        
        const isAllCaps = line === line.toUpperCase() && line.length > 3 && line.length < 35 && !/\d/.test(line)
        
        if (isLikelySection || isAllCaps) {
          if (currentSection && currentSection.items.length > 0) {
            parsedSections.push(currentSection)
          }
          currentSection = {
            id: uid(),
            name: line.charAt(0).toUpperCase() + line.slice(1).toLowerCase().replace(/\s+/g, ' '),
            items: []
          }
          continue
        }
        
        // Buscar precios en la línea
        let priceFound = null
        for (const pattern of pricePatterns) {
          const match = line.match(pattern)
          if (match) {
            priceFound = parseFloat(match[0].replace(/[€euros\s]/gi, '').replace(',', '.'))
            break
          }
        }
        
        if (priceFound && priceFound > 0 && priceFound < 500) {
          // Crear sección por defecto si no hay ninguna
          if (!currentSection) {
            currentSection = {
              id: uid(),
              name: 'Carta',
              items: []
            }
          }
          
          // Extraer nombre del plato (todo antes del precio)
          let nameDesc = line.replace(/\d+[.,]\d{2}\s*€?/g, '').replace(/€\s*\d+[.,]\d{2}/g, '').trim()
          nameDesc = nameDesc.replace(/[.…]+$/, '').trim()
          
          if (nameDesc.length > 2 && nameDesc.length < 150) {
            const parts = nameDesc.split(/[–—-]/).map(p => p.trim()).filter(p => p.length > 1)
            const name = parts[0] || nameDesc
            const description = parts.slice(1).join('. ') || ''
            
            currentSection.items.push({
              id: uid(),
              name: name.substring(0, 100),
              description: description.substring(0, 200),
              image: '',
              calories: '',
              price: priceFound,
              currency: 'EUR',
              isVegan: /vegano|vegetal|vegan/i.test(nameDesc),
              isGlutenFree: /sin gluten|gluten.?free/i.test(nameDesc),
              isAvailable: true,
            })
          }
        }
      }
    }
    
    if (currentSection && currentSection.items.length > 0) {
      parsedSections.push(currentSection)
    }
    
    console.log('Secciones encontradas:', parsedSections.length, 'Platos:', parsedSections.reduce((a, s) => a + s.items.length, 0))
    
    return parsedSections
  }

  async function analyzeWithGemini(text) {
    if (!geminiApiKey.trim()) {
      throw new Error('Se requiere una API Key de Gemini')
    }
    
    const prompt = `Analiza el siguiente texto extraído de un menú de restaurante y extrae todos los platos con sus precios.

IMPORTANTE: Responde SOLO con un JSON válido, sin explicaciones ni texto adicional.

El formato debe ser exactamente:
{
  "sections": [
    {
      "name": "Nombre de la sección",
      "items": [
        {
          "name": "Nombre del plato",
          "description": "Descripción si existe",
          "price": 12.50,
          "isVegan": false,
          "isGlutenFree": false
        }
      ]
    }
  ]
}

Texto del menú:
${text.substring(0, 15000)}

Responde SOLO con el JSON:`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000,
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `Error API: ${response.status}`)
    }
    
    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Extraer JSON de la respuesta y limpiar caracteres de control
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta')
    }
    
    // Limpiar caracteres de control que pueden romper el JSON
    const cleanJson = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, ' ')  // Eliminar caracteres de control
      .replace(/\n/g, ' ')               // Reemplazar saltos de línea
      .replace(/\r/g, ' ')               // Reemplazar retornos de carro
      .replace(/\t/g, ' ')               // Reemplazar tabulaciones
      .replace(/\s+/g, ' ')              // Normalizar espacios múltiples
    
    const parsed = JSON.parse(cleanJson)
    
    return parsed.sections.map(section => ({
      id: uid(),
      name: section.name,
      items: section.items.map(item => ({
        id: uid(),
        name: item.name || '',
        description: item.description || '',
        image: '',
        calories: '',
        price: Number(item.price) || 0,
        currency: 'EUR',
        isVegan: Boolean(item.isVegan),
        isGlutenFree: Boolean(item.isGlutenFree),
        isAvailable: true,
      }))
    }))
  }

  function normalizeWebsiteUrl(input) {
    const value = (input || '').trim()
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    return `https://${value}`
  }

  async function fetchHtmlWithProxies(url) {
    const normalized = normalizeWebsiteUrl(url)
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`,
      `https://corsproxy.io/?${encodeURIComponent(normalized)}`,
    ]

    let lastError = null
    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.text()
      } catch (e) {
        lastError = e
      }
    }
    throw lastError || new Error('No se pudo descargar la web')
  }

  function firstArray(value) {
    return Array.isArray(value) ? value[0] : value
  }

  function extractRestaurantFromJsonLd(json) {
    const candidates = []
    const pushCandidate = (obj) => {
      if (obj && typeof obj === 'object') candidates.push(obj)
    }

    if (Array.isArray(json)) {
      json.forEach(pushCandidate)
    } else if (json && typeof json === 'object') {
      if (Array.isArray(json['@graph'])) json['@graph'].forEach(pushCandidate)
      else pushCandidate(json)
    }

    const restaurant = candidates.find((o) => {
      const t = o['@type']
      if (Array.isArray(t)) return t.includes('Restaurant') || t.includes('FoodEstablishment')
      return t === 'Restaurant' || t === 'FoodEstablishment'
    })

    if (!restaurant) return null

    const addr = restaurant.address || null
    const address = typeof addr === 'object'
      ? {
          street: addr.streetAddress || '',
          city: addr.addressLocality || '',
          postalCode: addr.postalCode || '',
          country: addr.addressCountry || '',
        }
      : { street: '', city: '', postalCode: '', country: '' }

    return {
      name: restaurant.name || '',
      image: firstArray(restaurant.image) || '',
      phone: restaurant.telephone || '',
      url: restaurant.url || '',
      cuisine: restaurant.servesCuisine || '',
      address,
    }
  }

  function extractFromHtml(html, fallbackUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const meta = (propOrName) => {
      const el =
        doc.querySelector(`meta[property="${propOrName}"]`) ||
        doc.querySelector(`meta[name="${propOrName}"]`)
      return el?.getAttribute('content')?.trim() || ''
    }

    // 1) JSON-LD
    let jsonLdRestaurant = null
    const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    for (const s of jsonLdScripts) {
      const raw = (s.textContent || '').trim()
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        const candidate = extractRestaurantFromJsonLd(parsed)
        if (candidate) {
          jsonLdRestaurant = candidate
          break
        }
      } catch {
        // ignorar
      }
    }

    // 2) OG/meta fallback
    const ogName = meta('og:site_name') || meta('og:title')
    const ogImage = meta('og:image')

    // 3) Teléfono: buscar enlaces tel:
    const telHref = doc.querySelector('a[href^="tel:"]')?.getAttribute('href') || ''
    const phone = telHref.replace(/^tel:/i, '').trim()

    // 4) Cocina: heurística muy básica desde meta keywords
    const keywords = meta('keywords')
    const cuisine = keywords && keywords.length < 80 ? keywords : ''

    const result = {
      name: jsonLdRestaurant?.name || ogName || doc.title || '',
      image: jsonLdRestaurant?.image || ogImage || '',
      phone: jsonLdRestaurant?.phone || phone || '',
      url: jsonLdRestaurant?.url || fallbackUrl || '',
      cuisine: jsonLdRestaurant?.cuisine || cuisine || '',
      address: jsonLdRestaurant?.address || { street: '', city: '', postalCode: '', country: '' },
    }

    return result
  }

  async function handleAutofillFromWebsite() {
    const url = normalizeWebsiteUrl(restaurantUrl)
    if (!url) return

    setWebAutofillLoading(true)
    setWebAutofillError('')

    try {
      const html = await fetchHtmlWithProxies(url)
      const data = extractFromHtml(html, url)

      if (data.name && !restaurantName) setRestaurantName(data.name)
      if (data.image && !restaurantImage) setRestaurantImage(data.image)
      if (data.phone && !restaurantPhone) setRestaurantPhone(data.phone)
      if (data.url && !restaurantUrl) setRestaurantUrl(data.url)
      if (data.cuisine && !restaurantCuisine) setRestaurantCuisine(String(data.cuisine))

      if (data.address) {
        if (data.address.street && !restaurantStreet) setRestaurantStreet(data.address.street)
        if (data.address.city && !restaurantCity) setRestaurantCity(data.address.city)
        if (data.address.postalCode && !restaurantPostalCode) setRestaurantPostalCode(data.address.postalCode)
        if (data.address.country && !restaurantCountry) setRestaurantCountry(data.address.country)
      }

      if (!data.name && !data.image && !data.phone && !data.cuisine) {
        setWebAutofillError('No se encontraron datos estructurados suficientes en la web.')
      }
    } catch (err) {
      setWebAutofillError(err?.message || 'No se pudo extraer información de la web.')
    }

    setWebAutofillLoading(false)
  }

  async function handleLoadPdfFromUrl() {
    if (!pdfUrl.trim()) {
      setPdfError('Introduce una URL válida')
      return
    }
    
    setPdfLoading(true)
    setPdfError('')
    
    try {
      // Intentar con diferentes proxies CORS
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(pdfUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(pdfUrl)}`,
      ]
      
      let arrayBuffer = null
      let lastError = null
      
      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          arrayBuffer = await response.arrayBuffer()
          break
        } catch (e) {
          lastError = e
          console.log(`Proxy failed: ${proxyUrl}`, e)
        }
      }
      
      if (!arrayBuffer) {
        throw lastError || new Error('No se pudo descargar el PDF')
      }
      
      const text = await extractTextFromPdf(arrayBuffer)
      console.log('Texto extraído:', text.substring(0, 500))
      
      let parsedSections
      if (useGemini && geminiApiKey.trim()) {
        parsedSections = await analyzeWithGemini(text)
      } else {
        parsedSections = parseMenuFromText(text)
      }
      console.log('Secciones parseadas:', parsedSections)
      
      if (parsedSections.length === 0) {
        setPdfError('No se pudieron extraer platos del PDF. Intenta subir el archivo directamente.')
        setPdfLoading(false)
        return
      }
      
      setSections(parsedSections)
      setShowPdfModal(false)
      setPdfUrl('')
      setActiveTab('editor')
    } catch (err) {
      console.error('Error completo:', err)
      setPdfError(`Error: ${err.message}. Intenta subir el archivo directamente.`)
    }
    
    setPdfLoading(false)
  }

  async function handleLoadPdfFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (useGemini && !geminiApiKey.trim()) {
      setPdfError('Introduce tu API Key de Gemini para usar el análisis con IA')
      return
    }
    
    setPdfLoading(true)
    setPdfError('')
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      console.log('Archivo cargado, tamaño:', arrayBuffer.byteLength)
      
      const text = await extractTextFromPdf(arrayBuffer)
      console.log('Texto extraído del archivo:', text.substring(0, 1000))
      
      let parsedSections
      if (useGemini && geminiApiKey.trim()) {
        parsedSections = await analyzeWithGemini(text)
      } else {
        parsedSections = parseMenuFromText(text)
      }
      console.log('Secciones parseadas:', parsedSections)
      
      if (parsedSections.length === 0) {
        setPdfError('No se pudieron extraer platos del PDF. El formato puede no ser compatible.')
        setPdfLoading(false)
        return
      }
      
      setSections(parsedSections)
      setShowPdfModal(false)
      setActiveTab('editor')
    } catch (err) {
      console.error(err)
      setPdfError(`Error: ${err.message}`)
    }
    
    setPdfLoading(false)
    event.target.value = ''
  }

  const jsonLdObject = useMemo(() => {
    const obj = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: restaurantName || 'Restaurante',
    }
    
    if (restaurantImage) obj.image = restaurantImage
    if (restaurantPhone) obj.telephone = restaurantPhone
    if (restaurantUrl) obj.url = restaurantUrl
    if (restaurantCuisine) obj.servesCuisine = restaurantCuisine
    
    if (restaurantStreet || restaurantCity || restaurantPostalCode) {
      obj.address = {
        '@type': 'PostalAddress',
        ...(restaurantStreet && { streetAddress: restaurantStreet }),
        ...(restaurantCity && { addressLocality: restaurantCity }),
        ...(restaurantPostalCode && { postalCode: restaurantPostalCode }),
        ...(restaurantCountry && { addressCountry: restaurantCountry }),
      }
    }
    
    obj.hasMenu = {
      '@type': 'Menu',
      hasMenuSection: sections.map((section) => ({
        '@type': 'MenuSection',
        name: section.name,
        hasMenuItem: section.items.map((item) => {
          const menuItem = {
            '@type': 'MenuItem',
            name: item.name,
            description: item.description,
          }
          
          if (item.image) menuItem.image = item.image
          
          if (item.calories) {
            menuItem.nutrition = {
              '@type': 'NutritionInformation',
              calories: `${item.calories} calories`,
            }
          }
          
          menuItem.offers = {
            '@type': 'Offer',
            price: String(Number(item.price || 0).toFixed(2)),
            priceCurrency: item.currency || 'EUR',
            availability: item.isAvailable
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          }
          
          const diets = [
            ...(item.isVegan ? ['https://schema.org/VeganDiet'] : []),
            ...(item.isGlutenFree ? ['https://schema.org/GlutenFreeDiet'] : []),
          ]
          if (diets.length > 0) menuItem.suitableForDiet = diets
          
          return menuItem
        }),
      })),
    }
    
    return obj
  }, [restaurantName, restaurantImage, restaurantPhone, restaurantUrl, restaurantCuisine, restaurantStreet, restaurantCity, restaurantPostalCode, restaurantCountry, sections])

  const jsonLdString = useMemo(() => {
    return JSON.stringify(jsonLdObject, null, 2)
  }, [jsonLdObject])

  function addSection() {
    const name = newSectionName.trim()
    if (!name) return

    setSections((prev) => [
      ...prev,
      {
        id: uid(),
        name,
        items: [],
      },
    ])
    setNewSectionName('')
  }

  function renameSection(sectionId, name) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name } : s)),
    )
  }

  function deleteSection(sectionId) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
  }

  function addItem(sectionId) {
    const currency = CURRENCIES[0]?.code || 'EUR'
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          items: [
            ...s.items,
            {
              id: uid(),
              name: 'Nuevo plato',
              description: 'Descripción del plato',
              image: '',
              calories: '',
              price: 0,
              currency,
              isVegan: false,
              isGlutenFree: false,
              isAvailable: true,
            },
          ],
        }
      }),
    )
  }

  function updateItem(sectionId, itemId, patch) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        }
      }),
    )
  }

  function deleteItem(sectionId, itemId) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s
        return { ...s, items: s.items.filter((it) => it.id !== itemId) }
      }),
    )
  }

  function downloadJson() {
    const blob = new Blob([jsonLdString], { type: 'application/ld+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'menu-semantico.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function copyToClipboard() {
    const scriptTag = `<script type="application/ld+json">\n${jsonLdString}\n</script>`
    navigator.clipboard.writeText(scriptTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const htmlSnippet = `<!-- Pega esto dentro del <head> de tu web -->
<script type="application/ld+json">
${jsonLdString}
</script>`

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-indigo-600 to-violet-600">
          <div className="text-lg font-bold text-white">Smart Menu</div>
          <div className="text-xs text-indigo-100">Semantic Manager</div>
        </div>

        <div className="p-2 border-b border-slate-200 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,application/ld+json"
            className="hidden"
            onChange={handleLoadJson}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Cargar JSON
          </button>
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-sm font-medium text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Importar PDF
          </button>
        </div>

        <nav className="p-2 space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab('inicio')}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === 'inicio'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Rocket className="h-4 w-4" />
            Inicio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === 'editor'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Utensils className="h-4 w-4" />
            Editor de Carta
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === 'preview'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye className="h-4 w-4" />
            Vista Cliente
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === 'json'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Code className="h-4 w-4" />
            Datos Web 3.0
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 absolute bottom-0 left-0 right-0">
          <div className="text-xs text-slate-500">Secciones: {sections.length}</div>
          <div className="text-xs text-slate-500">Platos: {totalItems}</div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => { setLegalTab('privacy'); setShowLegalModal(true) }}
              className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
            >
              Privacidad
            </button>
            <button
              type="button"
              onClick={() => { setLegalTab('terms'); setShowLegalModal(true) }}
              className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
            >
              Términos
            </button>
          </div>
        </div>
      </div>

      <main className="ml-64 p-6 min-h-screen">
        {activeTab === 'inicio' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Web Semántica para Restaurantes
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Haz tu menú <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">inteligente</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Genera datos estructurados JSON-LD que Google, Siri y Alexa pueden entender. Mejora tu SEO y visibilidad sin tocar código.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Utensils className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs font-bold text-indigo-600 mb-2">PASO 1</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Crea tu carta</h3>
                <p className="text-sm text-slate-600">Añade secciones y platos con precios, descripciones y etiquetas dietéticas.</p>
              </div>

              <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs font-bold text-emerald-600 mb-2">PASO 2</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Generación automática</h3>
                <p className="text-sm text-slate-600">El JSON-LD se genera en tiempo real siguiendo el estándar Schema.org.</p>
              </div>

              <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs font-bold text-amber-600 mb-2">PASO 3</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Publica en tu web</h3>
                <p className="text-sm text-slate-600">Copia el código y pégalo en el &lt;head&gt; de tu página. ¡Listo!</p>
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
                    Los datos estructurados permiten que los motores de búsqueda entiendan mejor tu contenido. Google puede mostrar tu menú directamente en los resultados de búsqueda con <strong className="text-white">rich snippets</strong>, aumentando tu visibilidad y clics.
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
                onClick={() => setActiveTab('editor')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Comenzar ahora
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Editor de Carta</h2>
                <p className="text-sm text-slate-500">Crea y edita tu menú. Los cambios se reflejan en tiempo real.</p>
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
                      {webAutofillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Extraer
                    </button>
                  </div>
                  {webAutofillError && (
                    <div className="mt-2 text-xs text-red-600">{webAutofillError}</div>
                  )}
                  {!webAutofillError && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      Se intentará leer datos públicos (JSON-LD / meta). No se almacena la información.
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
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
                                  {CURRENCIES.map((c) => (
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
                                  {CURRENCIES.find((c) => c.code === (item.currency || 'EUR'))?.symbol || '€'}
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
                                <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <input
                                  className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                                  value={item.calories || ''}
                                  onChange={(e) => updateItem(section.id, item.id, { calories: e.target.value })}
                                  placeholder="Calorías"
                                />
                                <span className="text-xs text-slate-500">kcal</span>
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
                                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-200"
                                  checked={item.isGlutenFree}
                                  onChange={(e) =>
                                    updateItem(section.id, item.id, { isGlutenFree: e.target.checked })
                                  }
                                />
                                Sin Gluten
                              </label>

                              <label className="inline-flex items-center gap-2 text-slate-700">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                                  checked={item.isAvailable}
                                  onChange={(e) =>
                                    updateItem(section.id, item.id, { isAvailable: e.target.checked })
                                  }
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
        )}

        {activeTab === 'preview' && (
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
              
              <div className={`bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-4 text-white ${restaurantImage ? '' : 'pt-6'}`}>
                <div className="text-xl font-bold">{restaurantName || 'Mi Restaurante'}</div>
                {restaurantCuisine && (
                  <div className="text-sm text-indigo-100 mt-0.5">{restaurantCuisine}</div>
                )}
                
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {restaurantPhone && (
                    <a href={`tel:${restaurantPhone}`} className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 hover:bg-white/30 transition-colors">
                      <Phone className="h-3 w-3" />
                      {restaurantPhone}
                    </a>
                  )}
                  {restaurantUrl && (
                    <a href={restaurantUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 hover:bg-white/30 transition-colors">
                      <Globe className="h-3 w-3" />
                      Web
                    </a>
                  )}
                </div>
                
                {(restaurantStreet || restaurantCity) && (
                  <div className="mt-3 flex items-start gap-1.5 text-xs text-indigo-100">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      {[restaurantStreet, restaurantCity, restaurantPostalCode, restaurantCountry].filter(Boolean).join(', ')}
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
                        <div className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">{section.name}</div>
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

                                    <div className={`text-base font-bold text-indigo-600 ${item.isAvailable ? '' : 'opacity-70'}`}>
                                      {Number(item.price || 0).toFixed(2)}{' '}
                                      {CURRENCIES.find((c) => c.code === (item.currency || 'EUR'))?.symbol || '€'}
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
        )}

        {activeTab === 'json' && (
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
                        copied 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Copia el código</p>
                        <p className="text-xs text-slate-600 mt-0.5">Haz clic en "Copiar" o descarga el archivo JSON.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Abre tu archivo HTML</p>
                        <p className="text-xs text-slate-600 mt-0.5">Localiza la etiqueta <code className="px-1 py-0.5 bg-white rounded text-indigo-600">&lt;head&gt;</code> de tu página web.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Pega el script</p>
                        <p className="text-xs text-slate-600 mt-0.5">Inserta el código dentro de <code className="px-1 py-0.5 bg-white rounded text-indigo-600">&lt;script type="application/ld+json"&gt;</code></p>
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
                        Usa la herramienta <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="underline font-medium">Rich Results Test</a> de Google para validar que tu código es correcto.
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
        )}
      </main>

      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <FileText className="h-6 w-6" />
                <div>
                  <div className="font-bold">Importar desde PDF</div>
                  <div className="text-xs text-amber-100">Extrae automáticamente los platos de tu carta</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowPdfModal(false); setPdfError(''); setPdfUrl('') }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    <span className="font-medium text-slate-800">Análisis con IA (Gemini)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useGemini}
                      onChange={(e) => setUseGemini(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
                
                {useGemini && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        API Key de Gemini
                      </label>
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                      />
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <div className="mt-0.5">🔒</div>
                      <div>
                        Tu API Key <strong>no se almacena</strong> y solo se usa para esta sesión. 
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline ml-1">
                          Obtener API Key gratis →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                
                {!useGemini && (
                  <p className="text-xs text-slate-500">
                    Sin IA, se usará detección automática de patrones (menos precisa).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Link className="h-4 w-4 inline mr-1.5" />
                  Desde URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://ejemplo.com/carta.pdf"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <button
                    type="button"
                    onClick={handleLoadPdfFromUrl}
                    disabled={pdfLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Cargar
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-500">o</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Upload className="h-4 w-4 inline mr-1.5" />
                  Subir archivo PDF
                </label>
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleLoadPdfFile}
                />
                <button
                  type="button"
                  onClick={() => pdfFileInputRef.current?.click()}
                  disabled={pdfLoading}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-amber-400 hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  {pdfLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                      <span className="text-sm text-slate-600">Procesando PDF...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-slate-400" />
                      <span className="text-sm text-slate-600">Haz clic para seleccionar un archivo PDF</span>
                      <span className="text-xs text-slate-400">Formatos soportados: PDF con texto seleccionable</span>
                    </div>
                  )}
                </button>
              </div>

              {pdfError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {pdfError}
                </div>
              )}

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="text-xs text-amber-800">
                  <strong>Nota:</strong> El PDF debe contener texto seleccionable (no escaneado). 
                  El sistema detectará automáticamente secciones y platos con precios.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLegalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="text-white">
                <div className="font-bold">Información legal</div>
                <div className="text-xs text-slate-200">Privacidad y términos de uso</div>
              </div>
              <button
                type="button"
                onClick={() => setShowLegalModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setLegalTab('privacy')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    legalTab === 'privacy'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Política de privacidad
                </button>
                <button
                  type="button"
                  onClick={() => setLegalTab('terms')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    legalTab === 'terms'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Términos y condiciones
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 max-h-[60vh] overflow-auto">
                {legalTab === 'privacy' ? (
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="text-base font-semibold text-slate-900">Política de privacidad</div>
                    <p>
                      La aplicación se ejecuta localmente en tu navegador. Los datos que introduces (p. ej. nombre del restaurante,
                      secciones, platos, precios e imágenes) se gestionan en memoria durante el uso de la aplicación.
                    </p>
                    <p>
                      La aplicación no incluye un sistema de cuentas ni un backend de almacenamiento. En consecuencia,
                      <strong>no almacenamos</strong> tu menú ni tu API Key en servidores propios.
                    </p>
                    <p>
                      Finalidad: facilitar la edición del menú y la generación de datos estructurados (JSON-LD) para su uso en tu web.
                      Base de uso: ejecución de la herramienta a solicitud del usuario.
                    </p>
                    <p>
                      Análisis con IA (Gemini): si activas esta opción y proporcionas una API Key, la aplicación enviará el texto
                      extraído del PDF al servicio de Google (Gemini) para obtener una propuesta de estructura del menú.
                      La API Key se utiliza únicamente para realizar la petición y permanece solo en memoria durante la sesión.
                    </p>
                    <p>
                      Terceros: el uso de Gemini implica el tratamiento de datos por parte de Google conforme a sus políticas y
                      condiciones. Recomendamos no incluir información sensible en los documentos analizados.
                    </p>
                    <p>
                      Registro técnico: la aplicación no incorpora analítica propia. No obstante, el navegador, extensiones o el
                      proveedor de red pueden registrar información técnica (p. ej. solicitudes de red, logs o direcciones IP) al
                      acceder a recursos externos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="text-base font-semibold text-slate-900">Términos y condiciones</div>
                    <p>
                      Condiciones de uso: al utilizar esta herramienta aceptas que su finalidad es asistirte en la creación y
                      mantenimiento de un menú y en la generación de JSON-LD, y que los resultados pueden requerir revisión manual.
                    </p>
                    <p>
                      Exactitud y verificación: eres el único responsable de revisar, validar y corregir los datos importados
                      (incluyendo los extraídos desde PDF) y el JSON-LD generado antes de publicarlo o integrarlo en tu sitio web.
                    </p>
                    <p>
                      Uso “tal cual”: la herramienta se proporciona “tal cual”, sin garantías expresas o implícitas, incluyendo,
                      a título enunciativo, garantías de exactitud, idoneidad para un propósito particular o disponibilidad.
                    </p>
                    <p>
                      Limitación de responsabilidad: en la medida permitida por la normativa aplicable, el proveedor/autor de esta
                      herramienta no será responsable de daños directos o indirectos, pérdida de beneficios, pérdida de datos, daños
                      reputacionales, interrupciones del negocio o cualquier perjuicio derivado del uso o imposibilidad de uso.
                    </p>
                    <p>
                      Servicios de terceros (Gemini): si introduces y utilizas una API Key de Gemini, aceptas las condiciones del
                      proveedor correspondiente y asumes cualquier coste, limitación, suspensión del servicio, y responsabilidades
                      asociadas al uso de dicha API.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
