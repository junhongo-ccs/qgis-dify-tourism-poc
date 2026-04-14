import http from 'node:http'
import { createReadStream } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const distDir = path.join(webRoot, 'dist')
const port = Number(process.env.PORT || 3000)
const apiKey = process.env.DIFY_API_KEY?.trim() || ''
const apiBaseUrl = (process.env.DIFY_API_BASE_URL || 'https://api.dify.ai').replace(/\/$/, '')
const appPath = process.env.DIFY_APP_PATH || '/v1/chat-messages'

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
}

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers)
  response.end(body)
}

function sendJson(response, statusCode, payload) {
  send(response, statusCode, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(payload))
}

function resolveContentType(filePath) {
  return contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

async function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('Request body is too large'))
        request.destroy()
      }
    })
    request.on('end', () => resolve(raw))
    request.on('error', reject)
  })
}

function normalizePayload(input) {
  const tourismContext = input?.inputs?.tourism_context ?? null
  return {
    query: input?.query ?? '',
    inputs: {
      ...input?.inputs,
      tourism_context:
        tourismContext && typeof tourismContext === 'object'
          ? JSON.stringify(tourismContext)
          : tourismContext ?? '',
    },
    response_mode: input?.response_mode ?? 'blocking',
    user: input?.user ?? 'qgis-tourism-poc',
    conversation_id: input?.conversation_id || undefined,
    auto_generate_name: input?.auto_generate_name ?? false,
  }
}

async function proxyToDify(request, response) {
  if (!apiKey) {
    sendJson(response, 500, {
      message: 'DIFY_API_KEY が設定されていません。Railway の Variables に追加してください。',
    })
    return
  }

  const rawBody = await readBody(request)
  let incoming = {}
  if (rawBody) {
    try {
      incoming = JSON.parse(rawBody)
    } catch {
      sendJson(response, 400, { message: 'JSON の解析に失敗しました。' })
      return
    }
  }

  const upstreamResponse = await fetch(`${apiBaseUrl}${appPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizePayload(incoming)),
  })

  const text = await upstreamResponse.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw_text: text }
  }

  if (!upstreamResponse.ok) {
    sendJson(response, upstreamResponse.status, {
      message: data?.message || data?.error || 'Dify への送信に失敗しました',
      details: data,
    })
    return
  }

  sendJson(response, 200, data)
}

async function serveFile(response, filePath) {
  const body = await readFile(filePath)
  send(response, 200, { 'Content-Type': resolveContentType(filePath) }, body)
}

async function serveSpa(response) {
  await serveFile(response, path.join(distDir, 'index.html'))
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname

  if (pathname === '/api/dify/chat') {
    if (request.method === 'OPTIONS') {
      send(response, 204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      })
      return
    }

    if (request.method === 'POST') {
      try {
        await proxyToDify(request, response)
      } catch (error) {
        sendJson(response, 500, {
          message: error instanceof Error ? error.message : 'Dify proxy の処理に失敗しました',
        })
      }
      return
    }
  }

  const safePath = pathname === '/' ? '/index.html' : pathname
  const filePath = path.join(distDir, safePath)

  if (!filePath.startsWith(distDir)) {
    sendJson(response, 400, { message: 'Invalid path' })
    return
  }

  try {
    const stat = await access(filePath).then(() => true).catch(() => false)
    if (stat) {
      await serveFile(response, filePath)
      return
    }
  } catch {
    // fall through to SPA fallback
  }

  await serveSpa(response)
})

server.listen(port, () => {
  console.log(`Railway server listening on http://0.0.0.0:${port}`)
})
