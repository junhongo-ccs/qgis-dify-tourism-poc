import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { phase1AreaGeojson } from './areaGeojson'

const metricDefinitions = [
  { key: 'cafe', label: 'カフェ', countField: 'cafe_count', densityField: 'cafe_density' },
  { key: 'restaurant', label: 'レストラン', countField: 'restaurant_count', densityField: 'restaurant_density' },
  { key: 'museum', label: 'ミュージアム', countField: 'museum_count', densityField: 'museum_density' },
  { key: 'hotel', label: 'ホテル', countField: 'hotel_count', densityField: 'hotel_density' },
  { key: 'station', label: '駅', countField: 'station_count', densityField: 'station_density' },
]

const metricCards = [
  { label: '対象エリア数', value: '4', detail: 'Phase 1 のポリゴン' },
  { label: '指標カテゴリ', value: '5', detail: '件数と密度を表示' },
  { label: '回答モード', value: '根拠重視', detail: '指標に基づいて説明' },
]

const chatPrompts = [
  'このエリアはどんな観光体験に向いていますか？',
  '品川とお台場はどう違いますか？',
  '初めての来訪者にとって歩きやすいのはどこですか？',
]

const areaMeta = {
  shinagawa: {
    accent: 'from-cyan-400 to-sky-600',
    fill: '#67e8f9',
    stroke: '#06b6d4',
  },
  oimachi: {
    accent: 'from-emerald-400 to-teal-600',
    fill: '#6ee7b7',
    stroke: '#10b981',
  },
  shiba_park_tokyo_tower: {
    accent: 'from-amber-300 to-orange-500',
    fill: '#fcd34d',
    stroke: '#f59e0b',
  },
  odaiba: {
    accent: 'from-fuchsia-400 to-rose-500',
    fill: '#f9a8d4',
    stroke: '#f43f5e',
  },
}

const themeLabels = {
  gateway: 'ゲートウェイ',
  redevelopment_mixed_urban: '再開発・都市回遊',
  landmark_park_walk: 'ランドマーク・公園散策',
  waterfront_leisure: 'ウォーターフロント・レジャー',
}

const metricIcons = {
  cafe: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M4 10h11v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 11h2a2 2 0 1 1 0 4h-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 7c0-1 1-1.4 1-2.4M10 7c0-1 1-1.4 1-2.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  restaurant: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M7 3v8M4.5 3v4a2.5 2.5 0 0 0 5 0V3M7 11v10M15 3v18M15 3c2.2 0 4 1.8 4 4v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  museum: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M3 9 12 4l9 5M5 10v7M10 10v7M14 10v7M19 10v7M3 19h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  hotel: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M5 5v14M5 12h14v7M9 8v4M14 9h2a3 3 0 0 1 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  station: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M8 4h8a2 2 0 0 1 2 2v7a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h6M10 20l2-3 2 3M8 13h.01M16 13h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

function parseCsv(text) {
  const rows = []
  let current = ''
  let row = []
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current)
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }
  if (current !== '' || row.length > 0) {
    row.push(current)
    rows.push(row)
  }
  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map((values) => Object.fromEntries(header.map((key, columnIndex) => [key, values[columnIndex] ?? ''])))
}

function parseNumber(value) {
  return value === '' ? null : Number(value)
}

function createAreaNote(areaName, strongestMetric) {
  if (!strongestMetric) return `${areaName} は、QGIS から追加の指標を出力すると、より具体的に説明できます。`
  if (strongestMetric.key === 'station') return `${strongestMetric.label}の指標が最も強く、エリア内を移動しやすい可能性があります。`
  if (strongestMetric.key === 'museum') return `${strongestMetric.label}の件数が相対的に強く、文化寄りの解釈を支えます。`
  return `${strongestMetric.label}の件数が、このエリアでいちばん強いシグナルになっています。`
}

function createPopupFact(area) {
  if (!area) return ''
  return `カフェ ${area.counts.cafe}件、レストラン ${area.counts.restaurant}件、駅 ${area.counts.station}件、ホテル ${area.counts.hotel}件を確認しています。`
}

function createPopupNarrative(area) {
  if (!area) return ''

  const strongest = area.strongestMetric?.key

  switch (area.id) {
    case 'shinagawa':
      return strongest === 'restaurant'
        ? 'ゲートウェイ系のテーマに対して、レストラン 53件が最も強いシグナルです。'
        : 'ゲートウェイ系のテーマで、飲食と宿泊がまとまって見える構成です。'
    case 'oimachi':
      return strongest === 'restaurant'
        ? '再開発・都市回遊のテーマで、レストラン 16件が中心です。'
        : '再開発・都市回遊のテーマで、カフェと駅がほどよく混ざっています。'
    case 'shiba_park_tokyo_tower':
      return strongest === 'restaurant'
        ? 'ランドマーク・公園散策のテーマで、レストラン 38件が目立ちます。'
        : 'ランドマーク・公園散策のテーマで、歩きながら使う飲食が支えています。'
    case 'odaiba':
      return strongest === 'station'
        ? 'ウォーターフロント・レジャーのテーマで、駅 12件が動線の強さを示しています。'
        : 'ウォーターフロント・レジャーのテーマで、駅とレストランとミュージアムが混ざります。'
    default:
      return createPopupFact(area)
  }
}

function toAreaRecord(row) {
  const counts = Object.fromEntries(metricDefinitions.map((metric) => [metric.key, Number(row[metric.countField] || 0)]))
  const densities = Object.fromEntries(metricDefinitions.map((metric) => [metric.key, parseNumber(row[metric.densityField])]))
  const strongestMetric = metricDefinitions
    .map((metric) => ({ key: metric.key, label: metric.label, value: counts[metric.key] }))
    .sort((left, right) => right.value - left.value)[0] ?? null
  return {
    id: row.area_id,
    name: row.area_name,
    tone: themeLabels[row.theme] ?? row.theme,
    status: row.status,
    areaKm2: parseNumber(row.area_km2),
    counts,
    densities,
    strongestMetric,
    accent: areaMeta[row.area_id]?.accent ?? 'from-slate-400 to-slate-600',
    note: createAreaNote(row.area_name, strongestMetric),
  }
}

function formatMetricValue(value) {
  if (value === null || Number.isNaN(value)) return 'N/A'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function getFeatureCenter(feature) {
  const ring = feature?.geometry?.coordinates?.[0] ?? []
  if (ring.length === 0) {
    return [35.635, 139.758]
  }

  const uniquePoints = ring.slice(0, -1)
  const summary = uniquePoints.reduce(
    (accumulator, [lng, lat]) => ({
      lat: accumulator.lat + lat,
      lng: accumulator.lng + lng,
    }),
    { lat: 0, lng: 0 },
  )

  return [summary.lat / uniquePoints.length, summary.lng / uniquePoints.length]
}

function getFeatureBounds(features) {
  const points = features.flatMap((feature) => feature?.geometry?.coordinates?.[0] ?? [])
  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function MapDismiss({ onDismiss }) {
  useMapEvents({
    click: (event) => {
      const target = event.originalEvent?.target
      if (target instanceof Element && target.closest('.leaflet-interactive')) {
        return
      }
      onDismiss()
    },
  })

  return null
}

function MapFitBounds() {
  const map = useMap()

  useEffect(() => {
    const bounds = getFeatureBounds(phase1AreaGeojson.features)
    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: 13,
    })
  }, [map])

  return null
}

function PopupOverlay({ popupArea, popupPosition }) {
  const map = useMap()
  const [style, setStyle] = useState(null)

  useEffect(() => {
    if (!popupArea || !popupPosition) {
      setStyle(null)
      return
    }

    function updatePosition() {
      const point = map.latLngToContainerPoint(popupPosition)
      const cardWidth = 320
      const cardHeight = 238
      const mapSize = map.getSize()
      const left = clamp(point.x - cardWidth / 2, 16, mapSize.x - cardWidth - 16)
      const top = clamp(point.y - cardHeight - 18, 16, mapSize.y - cardHeight - 16)

      setStyle({
        left: `${left}px`,
        top: `${top}px`,
      })
    }

    updatePosition()
    map.on('zoom move resize', updatePosition)
    return () => {
      map.off('zoom move resize', updatePosition)
    }
  }, [map, popupArea, popupPosition])

  if (!popupArea || !style) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[500]"
      aria-hidden="true"
    >
      <div
        className="pointer-events-auto absolute w-[20rem] rounded-[28px] border border-white/10 bg-slate-950/96 p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur"
        style={style}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-white">{popupArea.name}</p>
            <p className="mt-1 text-base text-slate-300">{popupArea.tone}</p>
          </div>
          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${popupArea.accent} shadow-lg`} />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
          {Object.entries(popupArea.counts).map(([key, value]) => (
            <div key={key} className="rounded-2xl bg-white/6 px-2 py-2">
              <div
                className="flex items-center justify-center text-slate-300"
                title={metricDefinitions.find((metric) => metric.key === key)?.label ?? key}
                aria-label={metricDefinitions.find((metric) => metric.key === key)?.label ?? key}
              >
                {metricIcons[key] ?? <span className="uppercase tracking-[0.18em] text-slate-400">{key}</span>}
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-200">{createPopupNarrative(popupArea)}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{createPopupFact(popupArea)}</p>
      </div>
    </div>
  )
}

function TourismMap({ areas, activeAreaId, popupAreaId, onSelectArea, onDismissPopup }) {
  const areasById = useMemo(() => Object.fromEntries(areas.map((area) => [area.id, area])), [areas])
  const popupFeature = useMemo(
    () => phase1AreaGeojson.features.find((feature) => feature.properties.area_id === popupAreaId) ?? null,
    [popupAreaId],
  )
  const popupArea = popupAreaId ? areasById[popupAreaId] : null
  const popupPosition = popupFeature ? getFeatureCenter(popupFeature) : null

  return (
    <MapContainer
      center={[35.635, 139.758]}
      zoom={13}
      minZoom={11}
      maxZoom={17}
      zoomControl={true}
      className="h-full w-full rounded-[24px]"
      scrollWheelZoom={true}
    >
      <MapFitBounds />
      <MapDismiss onDismiss={onDismissPopup} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={phase1AreaGeojson}
        style={(feature) => {
          const areaId = feature?.properties?.area_id
          const palette = areaMeta[areaId] ?? areaMeta.shinagawa
          const active = areaId === activeAreaId
          return {
            color: palette.stroke,
            fillColor: palette.fill,
            fillOpacity: active ? 0.55 : 0.28,
            weight: active ? 3 : 2,
          }
        }}
        onEachFeature={(feature, layer) => {
          layer.on({
            click: (event) => {
              event.originalEvent?.stopPropagation?.()
              onSelectArea(feature.properties.area_id)
            },
          })
        }}
      />
      <PopupOverlay popupArea={popupArea} popupPosition={popupPosition} />
    </MapContainer>
  )
}

function App() {
  const [areas, setAreas] = useState([])
  const [activeAreaId, setActiveAreaId] = useState('shinagawa')
  const [popupAreaId, setPopupAreaId] = useState('shinagawa')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadAreas() {
      try {
        const response = await fetch('/exports/phase1_areas_summary_counts.csv')
        if (!response.ok) throw new Error(`Failed to load CSV: ${response.status}`)
        const rows = parseCsv(await response.text())
        if (!active) return
        const mapped = rows.map(toAreaRecord)
        setAreas(mapped)
        const nextAreaId = mapped.find((area) => area.id === activeAreaId)?.id ?? mapped[0]?.id ?? ''
        setActiveAreaId(nextAreaId)
        setPopupAreaId(nextAreaId)
        setError('')
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'CSV の読み込みで不明なエラーが発生しました')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadAreas()
    return () => {
      active = false
    }
  }, [])

  function handleSelectArea(areaId) {
    setActiveAreaId(areaId)
    setPopupAreaId(areaId)
  }

  const selectedAreas = useMemo(() => {
    if (areas.length === 0) return { left: null, right: null }
    const left = areas.find((area) => area.id === activeAreaId) ?? areas[0]
    const right = areas.find((area) => area.id !== left.id) ?? left
    return { left, right }
  }, [activeAreaId, areas])

  const comparisonRows = useMemo(() => {
    const { left, right } = selectedAreas
    if (!left || !right) return []
    return metricDefinitions.slice(0, 3).map((metric) => {
      const leftValue = left.densities[metric.key] ?? left.counts[metric.key]
      const rightValue = right.densities[metric.key] ?? right.counts[metric.key]
      const total = leftValue + rightValue
      return {
        label: left.densities[metric.key] !== null && right.densities[metric.key] !== null ? `${metric.label}密度` : `${metric.label}件数`,
        leftValue,
        rightValue,
        winner: leftValue === rightValue ? '同率' : leftValue > rightValue ? left.name : right.name,
        leftShare: total === 0 ? 50 : Math.max(18, Math.round((leftValue / total) * 100)),
      }
    })
  }, [selectedAreas])

  const insightLines = useMemo(() => {
    const { left, right } = selectedAreas
    if (!left || !right) return []
    const foodLeader = left.counts.restaurant >= right.counts.restaurant ? left.name : right.name
    const stationLeader = left.counts.station >= right.counts.station ? left.name : right.name
    return [
      `今回の出力では ${foodLeader} のレストラン件数が多く、食を軸にした説明を付けやすいです。`,
      `今回の出力では ${stationLeader} の駅件数が多く、アクセスしやすさの説明を慎重に補強できます。`,
      '雰囲気、家族向け適性、人気度のような表現は、この要約指標だけでは断定せず追加根拠を待つべきです。',
    ]
  }, [selectedAreas])

  const assistantReply = useMemo(() => {
    const { left, right } = selectedAreas
    if (!left || !right) return '要約データの読み込みを待っています。'
    return `${left.name} は、今回の出力ではレストランとカフェの件数が多く、さらに駅とホテルも同じエリア内に一定数あるため、最初の滞在拠点としてやや扱いやすい可能性があります。${right.name} と比べると、飲食選択肢がまとまっている解釈を出しやすいですが、これはあくまで指標にもとづく解釈であり、断定的な順位づけではありません。`
  }, [selectedAreas])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-[28px] border border-white/70 bg-white/65 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700">QGIS + Dify Tourism PoC</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">地図を主役にした、根拠付き観光インサイト画面。</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">この React 画面は QGIS から出力した CSV を読み込み、固定データではなく実データをもとに比較表示できます。</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[34rem]">
              {metricCards.map((card) => (
                <article key={card.label} className="rounded-2xl border border-slate-200/80 bg-slate-950 px-4 py-4 text-white shadow-lg shadow-slate-950/10">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                  <p className="mt-1 text-sm text-slate-300">{card.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="grid min-h-0 gap-4">
            <div className="relative overflow-hidden rounded-[32px] p-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,_rgba(56,189,248,0.10),_transparent_28%),radial-gradient(circle_at_80%_15%,_rgba(250,204,21,0.10),_transparent_20%)]" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">メインマップ</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Phase 1 観光エリア</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">OSM ベースマップの上に 4 エリアのポリゴンを重ねています。エリアをクリックすると、地図内に概要カードが表示されます。</p>
                </div>
                <div className="hidden rounded-full border border-cyan-400/40 bg-cyan-50 px-4 py-2 text-xs font-medium text-cyan-700 sm:block">ドラッグ・ズーム可能</div>
              </div>

              <div className="relative z-10 mt-5">
                <div className="relative h-[calc(100vh-18rem)] min-h-[34rem] overflow-hidden rounded-[24px] bg-white lg:h-[calc(100vh-12rem)]">
                  {!loading && !error ? (
                    <TourismMap
                      areas={areas}
                      activeAreaId={activeAreaId}
                      popupAreaId={popupAreaId}
                      onSelectArea={handleSelectArea}
                      onDismissPopup={() => setPopupAreaId('')}
                    />
                  ) : null}
                  {loading ? <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-cyan-300/20 bg-slate-900/80 px-4 py-3 text-sm text-cyan-100">CSV を読み込み中...</div> : null}
                  {error ? <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-rose-300/30 bg-rose-950/80 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[32px] border border-white/75 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-700">Dify レール</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">根拠付きアシスタント</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">このパネルは、将来の Dify 埋め込みや API 応答面を想定しています。いまは最終体験のトーンと構成を示しています。</p>
            <div className="mt-5 rounded-[28px] bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">質問候補</p>
              <div className="mt-3 space-y-2">
                {chatPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="w-full rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-left text-sm transition hover:bg-white/12">{prompt}</button>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <article className="rounded-[28px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">回答例</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{assistantReply}</p>
              </article>
              <article className="rounded-[28px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">比較の要点</p>
                <div className="mt-3 space-y-3">
                  {comparisonRows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                        <span>{row.label}</span>
                        <span className="font-medium text-slate-950">{row.winner}</span>
                      </div>
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2">
                        <span className="text-right text-xs font-semibold text-slate-950">{formatMetricValue(row.leftValue)}</span>
                        <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${row.leftShare}%` }} />
                          <div className="h-full rounded-full bg-rose-400" style={{ width: `${100 - row.leftShare}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-950">{formatMetricValue(row.rightValue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">根拠メモ</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {insightLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </article>
              <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">この回答が許される理由</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <li>QGIS から出力された件数と密度だけを使っています。</li>
                  <li>人気、安全性、属性推定のような断定は避けています。</li>
                  <li>結論ではなく、指標にもとづく解釈として表現しています。</li>
                </ul>
              </article>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default App
