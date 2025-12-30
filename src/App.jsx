import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Code,
  Copy,
  Download,
  Dumbbell,
  Eye,
  FileText,
  Globe,
  Image,
  Leaf,
  Lightbulb,
  Link,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Rocket,
  Salad,
  Sparkles,
  Upload,
  Utensils,
  Video,
  X,
  Zap,
  Cookie,
  Droplets,
} from 'lucide-react'
import { useRef } from 'react'

import InicioTab from './tabs/InicioTab.jsx'
import EditorTab from './tabs/EditorTab.jsx'
import JsonTab from './tabs/JsonTab.jsx'
import PreviewTab from './tabs/PreviewTab.jsx'

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
  const [restaurantLicense, setRestaurantLicense] = useState('https://creativecommons.org/licenses/by/4.0/')
  const [dataSharingScope, setDataSharingScope] = useState('public')
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
        if (json.license) setRestaurantLicense(json.license)
        if (json.dataSharingScope) setDataSharingScope(json.dataSharingScope)
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
            const nutrition = item.nutrition || {}
            return {
              id: uid(),
              name: item.name || '',
              description: item.description || '',
              image: item.image || '',
              video: item.video || '',
              ingredients: Array.isArray(item.recipeIngredient) ? item.recipeIngredient.join(', ') : '',
              calories: item.nutrition?.calories?.replace(' calories', '') || '',
              protein: nutrition?.proteinContent?.replace(' grams', '') || '',
              carbs: nutrition?.carbohydrateContent?.replace(' grams', '') || '',
              fat: nutrition?.fatContent?.replace(' grams', '') || '',
              price: Number(item.offers?.price) || 0,
              currency: item.offers?.priceCurrency || 'EUR',
              isVegan: diets.includes('https://schema.org/VeganDiet'),
              isVegetarian: diets.includes('https://schema.org/VegetarianDiet'),
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
      isAccessibleForFree: true,
      license: restaurantLicense || undefined,
      termsOfService: restaurantUrl ? `${restaurantUrl}/terminos` : undefined,
      'dataSharingScope': dataSharingScope,
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
          if (item.video) menuItem.video = item.video
          
          if (item.calories || item.protein || item.carbs || item.fat) {
            menuItem.nutrition = {
              '@type': 'NutritionInformation',
              ...(item.calories && { calories: `${item.calories} calories` }),
              ...(item.protein && { proteinContent: `${item.protein} grams` }),
              ...(item.carbs && { carbohydrateContent: `${item.carbs} grams` }),
              ...(item.fat && { fatContent: `${item.fat} grams` }),
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
            ...(item.isVegetarian ? ['https://schema.org/VegetarianDiet'] : []),
            ...(item.isGlutenFree ? ['https://schema.org/GlutenFreeDiet'] : []),
          ]
          if (diets.length > 0) menuItem.suitableForDiet = diets

          if (item.ingredients?.length) {
            menuItem.recipeIngredient = item.ingredients.split(',').map((i) => i.trim()).filter(Boolean)
          }
          
          return menuItem
        }),
      })),
    }
    
    return obj
  }, [
    restaurantName,
    restaurantImage,
    restaurantPhone,
    restaurantUrl,
    restaurantCuisine,
    restaurantStreet,
    restaurantCity,
    restaurantPostalCode,
    restaurantCountry,
    restaurantLicense,
    dataSharingScope,
    sections,
  ])

  const jsonLdString = useMemo(() => {
    return JSON.stringify(jsonLdObject, null, 2)
  }, [jsonLdObject])

  const turtleString = useMemo(() => {
    const lines = [
      '@prefix schema: <https://schema.org/> .',
      '',
      '<#restaurant> a schema:Restaurant ;',
      `  schema:name """${restaurantName || 'Restaurante'}""" ;`,
      ...(restaurantLicense ? [`  schema:license <${restaurantLicense}> ;`] : []),
      ...(restaurantUrl ? [`  schema:url <${restaurantUrl}> ;`] : []),
      ...(restaurantCuisine ? [`  schema:servesCuisine """${restaurantCuisine}""" ;`] : []),
      ...(restaurantPhone ? [`  schema:telephone "${restaurantPhone}" ;`] : []),
      ...(restaurantStreet || restaurantCity
        ? [
            '  schema:address [',
            '    a schema:PostalAddress ;',
            ...(restaurantStreet ? [`    schema:streetAddress """${restaurantStreet}""" ;`] : []),
            ...(restaurantCity ? [`    schema:addressLocality """${restaurantCity}""" ;`] : []),
            ...(restaurantPostalCode ? [`    schema:postalCode "${restaurantPostalCode}" ;`] : []),
            ...(restaurantCountry ? [`    schema:addressCountry "${restaurantCountry}" ;`] : []),
            '  ] ;',
          ]
        : []),
      '  schema:hasMenu <#menu> .',
      '',
      '<#menu> a schema:Menu ;',
      '  schema:hasMenuSection ',
    ]

    sections.forEach((section, sIndex) => {
      const secNode = `<#section-${sIndex}>`
      lines.push(`  ${secNode}${sIndex === sections.length - 1 ? ' .' : ' ,'}`)
      lines.push('')
      lines.push(`${secNode} a schema:MenuSection ;`)
      lines.push(`  schema:name """${section.name}""" ;`)
      if (section.items.length) {
        lines.push('  schema:hasMenuItem ')
        section.items.forEach((item, iIndex) => {
          const itemNode = `<#item-${sIndex}-${iIndex}>`
          lines.push(`    ${itemNode}${iIndex === section.items.length - 1 ? ' .' : ' ,'}`)
          lines.push('')
          lines.push(`${itemNode} a schema:MenuItem ;`)
          lines.push(`  schema:name """${item.name}""" ;`)
          if (item.description) lines.push(`  schema:description """${item.description}""" ;`)
          if (item.image) lines.push(`  schema:image <${item.image}> ;`)
          if (item.video) lines.push(`  schema:video <${item.video}> ;`)
          if (item.ingredients)
            item.ingredients.split(',').map((i) => i.trim()).filter(Boolean).forEach((ing) => {
              lines.push(`  schema:recipeIngredient """${ing}""" ;`)
            })
          if (item.calories) lines.push(`  schema:nutrition [ a schema:NutritionInformation ; schema:calories "${item.calories} calories" ] ;`)
          lines.push(
            `  schema:offers [ a schema:Offer ; schema:price "${Number(item.price || 0).toFixed(2)}" ; schema:priceCurrency "${
              item.currency || 'EUR'
            }" ; schema:availability "${item.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}" ] ;`,
          )
          const diets = [
            ...(item.isVegan ? ['https://schema.org/VeganDiet'] : []),
            ...(item.isVegetarian ? ['https://schema.org/VegetarianDiet'] : []),
            ...(item.isGlutenFree ? ['https://schema.org/GlutenFreeDiet'] : []),
          ]
          diets.forEach((diet) => lines.push(`  schema:suitableForDiet <${diet}> ;`))
        })
      }
    })

    return lines.join('\n')
  }, [
    restaurantName,
    restaurantLicense,
    restaurantUrl,
    restaurantCuisine,
    restaurantPhone,
    restaurantStreet,
    restaurantCity,
    restaurantPostalCode,
    restaurantCountry,
    sections,
  ])

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
              description: '',
              image: '',
              video: '',
              ingredients: '',
              calories: '',
              protein: '',
              carbs: '',
              fat: '',
              price: 10,
              currency,
              isVegan: false,
              isVegetarian: false,
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

  function downloadTurtle() {
    const blob = new Blob([turtleString], { type: 'text/turtle' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'menu-semantico.ttl'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        {activeTab === 'inicio' && <InicioTab onStart={() => setActiveTab('editor')} />}

        {activeTab === 'editor' && (
          <EditorTab
            restaurantName={restaurantName}
            setRestaurantName={setRestaurantName}
            restaurantCuisine={restaurantCuisine}
            setRestaurantCuisine={setRestaurantCuisine}
            restaurantPhone={restaurantPhone}
            setRestaurantPhone={setRestaurantPhone}
            restaurantUrl={restaurantUrl}
            setRestaurantUrl={setRestaurantUrl}
            handleAutofillFromWebsite={handleAutofillFromWebsite}
            webAutofillLoading={webAutofillLoading}
            webAutofillError={webAutofillError}
            normalizeWebsiteUrl={normalizeWebsiteUrl}
            restaurantLicense={restaurantLicense}
            setRestaurantLicense={setRestaurantLicense}
            dataSharingScope={dataSharingScope}
            setDataSharingScope={setDataSharingScope}
            restaurantImage={restaurantImage}
            setRestaurantImage={setRestaurantImage}
            restaurantStreet={restaurantStreet}
            setRestaurantStreet={setRestaurantStreet}
            restaurantCity={restaurantCity}
            setRestaurantCity={setRestaurantCity}
            restaurantPostalCode={restaurantPostalCode}
            setRestaurantPostalCode={setRestaurantPostalCode}
            restaurantCountry={restaurantCountry}
            setRestaurantCountry={setRestaurantCountry}
            newSectionName={newSectionName}
            setNewSectionName={setNewSectionName}
            addSection={addSection}
            sections={sections}
            renameSection={renameSection}
            addItem={addItem}
            deleteSection={deleteSection}
            updateItem={updateItem}
            deleteItem={deleteItem}
            currencies={CURRENCIES}
          />
        )}

        {activeTab === 'preview' && (
          <PreviewTab
            restaurantName={restaurantName}
            restaurantImage={restaurantImage}
            restaurantCuisine={restaurantCuisine}
            restaurantPhone={restaurantPhone}
            restaurantUrl={restaurantUrl}
            restaurantStreet={restaurantStreet}
            restaurantCity={restaurantCity}
            restaurantPostalCode={restaurantPostalCode}
            restaurantCountry={restaurantCountry}
            sections={sections}
            currencies={CURRENCIES}
          />
        )}

        {activeTab === 'json' && (
          <JsonTab
            copied={copied}
            copyToClipboard={copyToClipboard}
            downloadJson={downloadJson}
            downloadTurtle={downloadTurtle}
            jsonLdString={jsonLdString}
            sections={sections}
            totalItems={totalItems}
          />
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
