import http from 'node:http'

const port = Number(process.env.PORT || 8787)
const apiKey = process.env.DIFY_API_KEY?.trim() || ''
const apiBaseUrl = (process.env.DIFY_API_BASE_URL || 'https://api.dify.ai').replace(/\/$/, '')
const appPath = process.env.DIFY_APP_PATH || '/v1/chat-messages'
const corsOrigin = process.env.CORS_ORIGIN || '*'

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  response.end(JSON.stringify(payload))
}

function readBody(request) {
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
  const inputs = {
    ...input?.inputs,
    tourism_context:
      tourismContext && typeof tourismContext === 'object'
        ? JSON.stringify(tourismContext)
        : tourismContext ?? '',
  }

  return {
    query: input?.query ?? '',
    inputs,
    response_mode: input?.response_mode ?? 'blocking',
    user: input?.user ?? 'qgis-tourism-poc',
    conversation_id: input?.conversation_id || undefined,
    auto_generate_name: input?.auto_generate_name ?? false,
  }
}

async function proxyToDify(request, response) {
  if (!apiKey) {
    sendJson(response, 500, {
      message: 'DIFY_API_KEY が設定されていません。.env に追加してください。',
    })
    return
  }

  const rawBody = await readBody(request)
  let incoming = {}
  if (rawBody) {
    try {
      incoming = JSON.parse(rawBody)
    } catch {
      sendJson(response, 400, {
        message: 'JSON の解析に失敗しました。',
      })
      return
    }
  }
  const upstreamBody = normalizePayload(incoming)

  const upstreamResponse = await fetch(`${apiBaseUrl}${appPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(upstreamBody),
  })

  const contentType = upstreamResponse.headers.get('content-type') || ''
  const upstreamText = await upstreamResponse.text()
  let upstreamData
  if (contentType.includes('application/json')) {
    try {
      upstreamData = JSON.parse(upstreamText || '{}')
    } catch {
      upstreamData = { raw_text: upstreamText }
    }
  } else {
    upstreamData = { raw_text: upstreamText }
  }

  if (!upstreamResponse.ok) {
    sendJson(response, upstreamResponse.status, {
      message: upstreamData?.message || upstreamData?.error || 'Dify への送信に失敗しました',
      details: upstreamData,
    })
    return
  }

  sendJson(response, 200, upstreamData)
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname

  if (pathname === '/api/dify/chat' && request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    })
    response.end()
    return
  }

  if (pathname === '/api/dify/chat' && request.method === 'POST') {
    try {
      await proxyToDify(request, response)
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : 'Dify proxy の処理に失敗しました',
      })
    }
    return
  }

  sendJson(response, 404, { message: 'Not Found' })
})

server.listen(port, () => {
  console.log(`Dify proxy listening on http://127.0.0.1:${port}`)
})
