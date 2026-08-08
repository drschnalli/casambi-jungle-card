# Casambi Jungle Card

A modern dark-blue Lovelace custom card for the Casambi Jungle Bridge Home Assistant integration.

Repository: https://github.com/drschnalli/casambi-jungle-card

## Features v0.3.0

- Redesigned dark-blue/neon-cyan visual style.
- Blue LED style status symbols for Bridge, BLE, Transport and Direct API.
- Improved visual editor with entity pickers for:
  - Light
  - Active scene sensor
  - Bridge status sensor
  - BLE status sensor
  - Transport sensor
  - Direct API sensor
  - Web UI URL sensor
  - API Fetch button
  - Restart button
  - Scene buttons with add/remove UI
- Auto scene discovery still works if no scene buttons are configured.
- Light control with power orb, brightness slider and quick ON/OFF/40% actions.
- Scene buttons with active scene highlight.

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

The card tries to auto-detect Casambi entities.

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
