# Dify Right Rail Contract

## Goal

This project uses the right rail as the conversation surface for Dify.

The map remains the main spatial UI. The right rail receives a structured context object from the selected area and sends it to a Dify-compatible endpoint.

## Frontend Env Vars

- `VITE_DIFY_CHAT_ENDPOINT`
  - optional
  - if unset, the rail stays in local fallback mode
  - recommended value: `/api/dify/chat`
- `VITE_DIFY_USER_ID`
  - optional
  - default: `qgis-tourism-poc`

## Expected Request Shape

The frontend sends a Dify-compatible blocking chat request to the configured endpoint:

```json
{
  "query": "ユーザーの質問",
  "inputs": {
    "tourism_context": {
      "schema_version": "phase1.v1",
      "selected_area_id": "shinagawa"
    }
  },
  "response_mode": "blocking",
  "user": "qgis-tourism-poc",
  "conversation_id": "optional-existing-id",
  "auto_generate_name": true
}
```

The proxy that sits behind `VITE_DIFY_CHAT_ENDPOINT` should forward this payload to Dify and return the JSON response.

## Expected Response Shape

The UI currently reads:

- `answer`
- `conversation_id`

If those fields are missing, the rail falls back to a local grounded reply so the UI remains usable during development.

## Local Fallback

When no endpoint is configured, the right rail still works as a chat surface.

In that mode it:

- appends the user question to the transcript
- generates a grounded local answer from the selected area summary
- keeps the conversation flow visible before the real Dify backend exists
