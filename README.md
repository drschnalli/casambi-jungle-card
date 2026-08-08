# Casambi Jungle Card

A Lovelace custom card for the Casambi Jungle Bridge Home Assistant integration.

Repository: https://github.com/drschnalli/casambi-jungle-card

## Features v0.2.0

- Jungle/neon design.
- Light card with state, brightness slider and quick ON/OFF/40% controls.
- Scene buttons with active scene highlight.
- Bridge status chips for MQTT/Direct/BLE/transport entities.
- Works with the Casambi Jungle Bridge HACS integration v2.2.0 or newer.
- Includes a simple visual card editor.

## Installation through HACS

Add this repository as a HACS custom repository of type **Dashboard**:

```text
https://github.com/drschnalli/casambi-jungle-card
```

Then install the card. HACS should add the Lovelace resource automatically.

## Example YAML

```yaml
type: custom:casambi-jungle-card
title: Casambi Jungle
light: light.minicontroller_casambi_dim2warm
active_scene: sensor.kalli_active_scene
scenes:
  - button.an
  - button.aus
status_entities:
  bridge: sensor.kalli_bridge_status
  ble: sensor.kalli_ble_status
  transport: sensor.kalli_transport_mode
  direct_api: sensor.kalli_direct_api_url
web_url: sensor.kalli_web_interface_url
api_fetch: button.kalli_api_fetch
restart: button.kalli_restart_bridge
```

## Auto mode

If `scenes` is empty, the card tries to find scene buttons using the `scene_id` attribute that the HACS integration exposes.

If `light` is empty, the card attempts to auto-pick the first available light entity with `casambi` in the entity ID or friendly name.
