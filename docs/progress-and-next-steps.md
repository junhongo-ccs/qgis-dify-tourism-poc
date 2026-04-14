# Progress And Next Steps

## Purpose

This document records the current QGIS progress for the Phase 1 tourism PoC so work can resume smoothly on a later day.

## Current Status

Work completed in QGIS:

- QGIS LTR was installed and launched
- a project file was created and saved in the repository
- Phase 1 area polygons were created for:
  - `shinagawa`
  - `oimachi`
  - `shiba_park_tokyo_tower`
  - `odaiba`
- a working polygon layer exists as `phase1_areas_polygon`
- QuickOSM was installed
- OSM data retrieval was tested successfully
- area-level counts were successfully aggregated into a summary layer
- the summary layer was normalized and exported to CSV
- `area_km2` and density fields were added for the final summary table

Work completed in the React / Dify-side PoC:

- the main screen now shows the map as the primary surface
- the right rail works as a lightweight question-and-answer surface
- local chat fallback exists so the UI can be exercised before Dify is connected
- a small Dify proxy contract was added for `POST /api/dify/chat`
- a grounded prompt draft and setup checklist were added for the Dify app
- GitHub Pages deployment is now the target for the frontend build

## Latest Known Summary Fields

The latest working summary table includes these fields:

- `area_id`
- `area_name`
- `theme`
- `status`
- `area_km2`
- `cafe_count`
- `restaurant_count`
- `museum_count`
- `hotel_count`
- `station_count`
- `cafe_density`
- `restaurant_density`
- `museum_density`
- `hotel_density`
- `station_density`

Latest known values from the current export:

| area_id | area_name | cafe_count | restaurant_count | museum_count | hotel_count | station_count |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `shinagawa` | `Shinagawa` | 27 | 53 | 5 | 7 | 5 |
| `oimachi` | `Oimachi` | 10 | 16 | 0 | 3 | 3 |
| `shiba_park_tokyo_tower` | `Shiba Park / Tokyo Tower` | 16 | 38 | 0 | 2 | 3 |
| `odaiba` | `Odaiba` | 18 | 29 | 5 | 2 | 12 |

The cleaned CSV export now exists at:

- `data/exports/phase1_areas_summary_counts.csv`

## Important Lessons Learned

These points matter for future work:

- keep `phase1_areas_polygon` as the source boundary layer
- use `Layer Extent = phase1_areas_polygon` or a canvas clearly showing all Phase 1 areas when running QuickOSM
- do not rely on partially accumulated summary layers without checking results after each step
- verify one category at a time before chaining multiple aggregations
- for counting, use point layers rather than polygon layers from QuickOSM results

## QGIS Artifacts To Keep

Keep these artifacts in the project:

- `phase1_areas_polygon`
- latest summary layer, currently named similar to `phase1_areas_summary_counts`
- QGIS project file:
  - `qgis/phase1-tourism-poc.qgz`

Intermediate layers that can be deleted or recreated:

- temporary `Count` output layers
- duplicate QuickOSM layers from failed or partial runs
- obsolete table-only layer created from the original template export

## Suggested Restart On Mac

If the next session starts on a Mac, resume in this order:

1. open the repository and confirm the branch is `codex/map-ui-dify-integration`
2. verify the React app still loads the summary CSV and the right chat rail
3. copy `web/.env.example` and `web/.env.proxy.example` into local `.env` files
4. create the Dify chat app using `docs/dify-setup-checklist.md`
5. paste the prompt draft from `docs/dify-prompt-draft.md`
6. set the app variable `tourism_context`
7. point `VITE_DIFY_CHAT_ENDPOINT` to the local proxy
8. enter the Dify API key only on the server side

## Recommended Task Sequence For Next Session

Resume work in this order.

### Task 1. Finish the Dify app

- publish the Chat App
- add the `tourism_context` input variable
- paste the grounded prompt
- obtain the app API key

### Task 2. Connect the local proxy

- create `.env` files from the examples
- run `npm run dify:proxy`
- point the frontend to the local proxy endpoint

### Task 3. Verify the live answer path

- send one question from the right rail
- confirm the response comes back from Dify
- check that the right rail still falls back cleanly when the proxy is absent

### Task 4. Optional future QGIS enrichment

- if the indicators need more nuance later, add extra evidence columns in QGIS
- keep those additions separate from the Dify connection work

## Quick Restart Checklist

At the start of the next session:

1. open `qgis/phase1-tourism-poc.qgz`
2. confirm `phase1_areas_polygon` is present
3. confirm the latest summary CSV is present
4. inspect the right rail copy before editing the Dify app
5. keep the API key server-side only

## Notes On What Not To Repeat

- do not start aggregating from an unclear temporary `Count` layer
- do not chain multiple steps without checking the intermediate attribute table
- do not assume `railway=station` will always return results in this area
- prefer `public_transport=station` if station retrieval is sparse

## Suggested Deliverables For The Next Working Session

If the next session goes well, the deliverables should be:

- live Dify answer path from the right rail
- published Dify app with the grounded prompt
- server-side API key configuration
- optional extra QGIS evidence fields if needed later
