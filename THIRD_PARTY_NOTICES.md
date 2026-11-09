# Third-party services and notices

This web application may use the following external resources and services:

- **Leaflet** (JavaScript mapping library): https://leafletjs.com/ , BSD-2-Clause licensed.
- **OpenStreetMap contributors** (map data): https://www.openstreetmap.org/copyright . Attribution and ODbL conditions apply as relevant.
- **CARTO** basemaps: https://carto.com/attributions . Respect their attribution and use policies.
- **OpenStreetMap Nominatim** search: https://operations.osmfoundation.org/policies/nominatim/ . Be mindful of their published usage limits and attribution requirements.
- **OpenStreetMap Overpass API**, where available, and **openstreetmap.de routing services**: provider terms, rate limits and availability apply.
- **Google Fonts** (Outfit/DM Sans): follow the corresponding font licenses as served by Google Fonts.
- **Anthropic** API: optional user-provided key; platform terms and billing apply.

This project package does **not** claim ownership of third-party libraries, map data, logos, services, or fonts. Check the current terms of each provider before public/commercial deployment.

## Key-free dark map and 3D renderer (2026-11-09)

- MapLibre GL JS (BSD-3-Clause): https://maplibre.org/
- OpenFreeMap: https://openfreemap.org/ (public vector tiles and styles, no API key)
- OpenMapTiles: https://openmaptiles.org/
- OpenStreetMap contributors: https://www.openstreetmap.org/copyright

The VIP navigation view is inspired by contemporary navigation interfaces, but **does not contain Waze/Google proprietary maps, traffic, police reports, or user reports**. Real-time traffic alerts are not implemented. Dynamic map providers and routing need internet. Provider attribution is visible in the map UI.

## Routing and turn-by-turn service
- Public OpenStreetMap routing service: https://routing.openstreetmap.de/
- OSRM project: https://project-osrm.org/ ; source https://github.com/Project-OSRM/osrm-backend
- Directions based on publicly available routing data, not live traffic.
  Providers have availability, rate limits and terms; high-volume use
  requires an appropriately hosted routing provider.

## Optional traffic and mapped road objects

- TomTom Traffic APIs (provider terms, authenticated key, rate limits and pricing): https://docs.tomtom.com/traffic-api/ and https://docs.tomtom.com/pricing
- OpenStreetMap mapped traffic signals and fixed speed cameras: https://www.openstreetmap.org/copyright and https://wiki.openstreetmap.org/wiki/Tag:highway%3Dspeed_camera
- OSRM intersection lane metadata: https://project-osrm.org/docs/v26.5.0/http

These data sources are **not** Google/Waze licensed incident or police feeds, and are not guaranteed complete. Never treat static OSM locations as live traffic-signal status.
