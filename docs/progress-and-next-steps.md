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

## Latest Known Summary Fields

The latest working summary table includes these fields:

- `area_id`
- `area_name`
- `theme`
- `status`
- `cafe_count`
- `restaurant_count`
- `museum_count`
- `hotel_count`
- `station_count`

Latest observed values from the screenshot:

| area_id | area_name | cafe_count | restaurant_count | museum_count | hotel_count | station_count |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `shinagawa` | `shinagwa` | 27 | 53 | 5 | 7 | 5 |
| `oimachi` | `oimachi` | 10 | 16 | 0 | 3 | 3 |
| `shiba_park_tokyo_tower` | `Shiba Park / Tokyo Tower` | 16 | 38 | 0 | 2 | 3 |
| `odaiba` | `odaiba` | 18 | 29 | 5 | 2 | 12 |

Important note:

- `area_name` for `shinagawa` still has a typo and should be corrected to `Shinagawa`

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

## Recommended First Task For Next Session

Start by cleaning and normalizing the current summary layer.

### 1. Fix naming issues

Correct these values in the summary layer:

- `area_id`: confirm all use lowercase stable ids
- `area_name`:
  - `shinagawa` row should become `Shinagawa`
  - `oimachi` row should become `Oimachi`
  - `odaiba` row should become `Odaiba`
- `status`: confirm all are `draft`

### 2. Save the cleaned summary layer

Export or save the cleaned result as a stable layer for later reuse.

Recommended name:

- `phase1_areas_summary_counts_clean`

## Recommended Task Sequence For Next Session

Resume work in this order.

### Task 1. Clean the summary layer

- fix typos in area names
- confirm row-to-polygon correspondence
- remove obsolete temporary layers

### Task 2. Add area and density fields

Create a metric-ready copy of the summary layer in a projected CRS and add:

- `area_km2`
- `cafe_density`
- `restaurant_density`
- `museum_density`
- `hotel_density`
- optionally `station_density`

Recommended workflow:

- export summary polygons to a projected CRS
- calculate `area_km2`
- calculate per-km2 density fields using field calculator

### Task 3. Export a CSV summary table

Export the cleaned summary layer as CSV for downstream use.

Recommended output:

- `data/exports/phase1_areas_summary_counts.csv`

### Task 4. Optionally enrich indicators

If time allows, add:

- `place_of_worship_count`
- category ratios
- nearest station distance
- basic textual evidence or keywords

## Quick Restart Checklist

At the start of the next session:

1. open `qgis/phase1-tourism-poc.qgz`
2. confirm `phase1_areas_polygon` is present
3. confirm the latest summary layer is present
4. inspect the attribute table before running more tools
5. clean naming and save a stable copy before new calculations

## Notes On What Not To Repeat

- do not start aggregating from an unclear temporary `Count` layer
- do not chain multiple steps without checking the intermediate attribute table
- do not assume `railway=station` will always return results in this area
- prefer `public_transport=station` if station retrieval is sparse

## Suggested Deliverables For The Next Working Session

If the next session goes well, the deliverables should be:

- cleaned summary layer
- projected metric version of the summary layer
- area and density fields
- exported CSV summary
- a short Dify-ready schema draft based on the CSV
