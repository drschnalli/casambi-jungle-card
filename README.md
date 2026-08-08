# Casambi Jungle Card

A modern dark jungle blue-green Lovelace custom card for the Casambi Jungle Bridge Home Assistant integration.

Repository: https://github.com/drschnalli/casambi-jungle-card

## Features v0.4.1

- Dark jungle blue/green design with calmer cyan/teal highlights.
- Blue LED status indicators with less saturated colors.
- Fixed visual editor dropdown closing immediately.
- Improved visual editor with proper entity pickers and stable default config handling.
- Cleaner Direct API display. URL-like API sensors are displayed as `available` instead of a long URL block.
- Light control with power orb, brightness slider and quick ON/OFF/40% controls.
- Scene buttons with active scene highlight.
- Auto-detection fallback for Casambi light, scenes and common status sensors.

## Installation through HACS

Add this repository as a HACS custom repository of type **Dashboard**:

```text
https://github.com/drschnalli/casambi-jungle-card
```

Then install the card. HACS should add the Lovelace resource automatically.

## Minimal YAML

```yaml
type: custom:casambi-jungle-card
```

## Full YAML example

```yaml
type: custom:casambi-jungle-card
title: Casambi Jungle
light: light.minicontroller_casambi_dim2warm
active_scene: sensor.kalli_active_scene
scenes:
  - button.an
  - button.aus
  - button.testszene
status_entities:
  bridge: sensor.kalli_bridge_status
  ble: sensor.kalli_ble_status
  transport: sensor.kalli_transport_mode
  direct_api: sensor.kalli_direct_api_url
web_url: sensor.kalli_web_interface_url
api_fetch: button.kalli_api_fetch
restart: button.kalli_restart_bridge
```


## Fix v0.4.1

- Prevents full editor re-render on every Home Assistant `hass` update.
- Entity picker dropdowns should now stay open and selectable.
- Scene list updates without rebuilding the whole editor.
- Even calmer dark green-blue jungle color tuning.
