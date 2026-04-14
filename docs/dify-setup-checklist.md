# Dify Setup Checklist

See also:

- `docs/railway-deploy.md`
- `docs/dify-design-plan.md`

## App Type

Use a `Chat App`.

This matches the frontend flow that sends `query` plus `inputs` to `POST /v1/chat-messages`.

## Prompt

Paste the draft from `docs/dify-prompt-draft.md`.

Keep these rules in the prompt:

- use only `tourism_context`
- answer in Japanese
- do not claim popularity, safety, crowd size, or atmosphere unless the payload supports it
- mention whether an answer is based on counts, density, or both

## Variables

Add one custom input variable:

- variable name: `tourism_context`
- label: `選択中のエリア情報`
- type: paragraph or long text
- required: yes

The frontend will send this as structured JSON text.

## Suggested Questions

Use these or close variants:

- このエリアはどんな観光体験に向いていますか？
- 品川とお台場はどう違いますか？
- 初めての来訪者にとって歩きやすいのはどこですか？

## Publish / API

After saving the app:

1. publish the app
2. copy the app API key
3. keep the API key on the server side only
4. point the local proxy to Dify with `web/.env.proxy.example`

If the app is deployed as a single Railway service, keep the frontend on the same origin and let the server-side proxy handle Dify requests.

## Local Dev Flow

1. `cd web`
2. create `.env` from `web/.env.example`
3. create `.env` for the proxy from `web/.env.proxy.example`
4. run `npm run dify:proxy`
5. run `npm run dev`

## Railway Deploy Flow

1. connect the GitHub repo to Railway
2. let Railway build from the repository `Dockerfile`
3. set `DIFY_API_KEY` in Railway only
4. set `DIFY_API_BASE_URL` if your Dify endpoint is not the default
5. deploy the service and open the Railway URL

## Notes

- The proxy already expects `tourism_context`
- The right rail can keep working in local fallback mode if Dify is not yet connected
- Web app access permissions in Dify are separate from API access
