const CJ_DEFAULT_CONFIG = {
  title: "Casambi Jungle",
  light: "",
  active_scene: "",
  scenes: [],
  status_entities: {},
  web_url: "",
  api_fetch: "",
  restart: ""
};

function cjMergeConfig(config) {
  return {
    ...CJ_DEFAULT_CONFIG,
    ...(config || {}),
    scenes: Array.isArray(config?.scenes) ? config.scenes : [],
    status_entities: {
      ...(config?.status_entities || {})
    }
  };
}

class CasambiJungleCard extends HTMLElement {
  static getStubConfig() { return { ...CJ_DEFAULT_CONFIG }; }
  static getConfigElement() { return document.createElement("casambi-jungle-card-editor"); }

  setConfig(config) {
    this.config = cjMergeConfig(config);
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) this.config = cjMergeConfig({});
    this.render();
  }

  getCardSize() { return 5; }

  stateObj(entity) { return entity ? this._hass?.states?.[entity] : undefined; }
  state(entity) { return this.stateObj(entity)?.state ?? "unknown"; }
  friendly(entity) { const o = this.stateObj(entity); return o?.attributes?.friendly_name || entity || ""; }

  findEntity(domain, contains = ["casambi", "jungle"]) {
    const states = this._hass?.states || {};
    return Object.keys(states).find((entityId) => {
      if (!entityId.startsWith(`${domain}.`)) return false;
      const hay = `${entityId} ${(states[entityId].attributes?.friendly_name || "")}`.toLowerCase();
      return contains.some((needle) => hay.includes(needle));
    }) || "";
  }

  autoLight() {
    return this.config.light || this.findEntity("light") || Object.keys(this._hass?.states || {}).find((entityId) => entityId.startsWith("light.")) || "";
  }

  autoStatusKey(key, candidates) {
    const configured = this.config.status_entities?.[key];
    if (configured) return configured;
    const states = this._hass?.states || {};
    return Object.keys(states).find((entityId) => {
      if (!entityId.startsWith("sensor.")) return false;
      const hay = `${entityId} ${(states[entityId].attributes?.friendly_name || "")}`.toLowerCase();
      return candidates.every((needle) => hay.includes(needle));
    }) || "";
  }

  sceneEntities() {
    if (Array.isArray(this.config.scenes) && this.config.scenes.length) return this.config.scenes;
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter((entityId) => entityId.startsWith("button.") && states[entityId].attributes && (states[entityId].attributes.scene_id !== undefined || states[entityId].attributes.scene_name !== undefined))
      .sort((a, b) => (states[a].attributes.scene_id || 0) - (states[b].attributes.scene_id || 0));
  }

  activeSceneName() {
    const activeEntity = this.config.active_scene || this.findEntity("sensor", ["active", "scene"]);
    const value = this.state(activeEntity);
    if (activeEntity && value && !["unknown", "unavailable", "none", ""].includes(String(value).toLowerCase())) return value;
    const activeButton = this.sceneEntities().find((entityId) => this.stateObj(entityId)?.attributes?.active === true);
    return activeButton ? (this.stateObj(activeButton)?.attributes?.scene_name || this.friendly(activeButton)) : "none";
  }

  isSceneActive(entity) {
    const obj = this.stateObj(entity);
    if (obj?.attributes?.active === true) return true;
    const active = this.activeSceneName().toLowerCase();
    const name = (obj?.attributes?.scene_name || obj?.attributes?.friendly_name || entity).toLowerCase();
    return active !== "none" && active !== "" && (active === name || name.includes(active));
  }

  pct(brightness) { return Math.round((Number(brightness || 0) * 100) / 255); }

  callLight(state, brightness) {
    const entity = this.autoLight();
    if (!entity) return;
    if (state === "OFF") {
      this._hass.callService("light", "turn_off", { entity_id: entity });
      return;
    }
    const data = { entity_id: entity };
    if (brightness !== undefined) data.brightness = Number(brightness);
    this._hass.callService("light", "turn_on", data);
  }

  pressButton(entity) {
    if (entity) this._hass.callService("button", "press", { entity_id: entity });
  }

  displayValue(label, entity) {
    const value = this.state(entity);
    if (label === "API" && /^https?:\/\//i.test(String(value))) return "available";
    if (label === "API" && String(value).includes("/api/")) return "available";
    if (label === "Transport" && String(value).toLowerCase() === "hybrid") {
      const mqttSwitch = this.findEntityByWords("switch", ["mqtt", "mode"]);
      const directSwitch = this.findEntityByWords("switch", ["direct", "mode"]);
      const mqtt = String(this.state(mqttSwitch)).toLowerCase();
      const direct = String(this.state(directSwitch)).toLowerCase();
      if (["off", "false", "0"].includes(mqtt) && ["on", "true", "1"].includes(direct)) return "direct";
    }
    return value;
  }

  findEntityByWords(domain, words) {
    const states = this._hass?.states || {};
    return Object.keys(states).find((entityId) => {
      if (!entityId.startsWith(`${domain}.`)) return false;
      const hay = `${entityId} ${(states[entityId].attributes?.friendly_name || "")}`.toLowerCase();
      return words.every((word) => hay.includes(word));
    }) || "";
  }

  ledChip(label, entity, icon) {
    const value = this.displayValue(label, entity);
    const normalized = String(value).toLowerCase();
    const good = ["on", "online", "connected", "direct", "hybrid", "mqtt", "available"].includes(normalized) || (label === "API" && !["unknown", "unavailable", "not configured"].includes(normalized));
    return `
      <div class="chip ${good ? "ok" : "standby"}">
        <span class="led"></span>
        <ha-icon icon="${icon}"></ha-icon>
        <span class="chipLabel">${label}</span>
        <b>${value}</b>
      </div>`;
  }

  render() {
    if (!this.shadowRoot || !this._hass) return;
    if (!this.config) this.config = cjMergeConfig({});

    const light = this.autoLight();
    const lightObj = this.stateObj(light);
    const isOn = lightObj?.state === "on";
    const brightness = lightObj?.attributes?.brightness || 0;
    const pct = this.pct(brightness);
    const activeScene = this.activeSceneName();
    const scenes = this.sceneEntities();
    const statusEntities = this.config.status_entities || {};
    const bridge = statusEntities.bridge || this.autoStatusKey("bridge", ["bridge", "status"]);
    const ble = statusEntities.ble || this.autoStatusKey("ble", ["ble"]);
    const transport = statusEntities.transport || this.autoStatusKey("transport", ["transport"]);
    const directApi = statusEntities.direct_api || this.autoStatusKey("direct_api", ["direct", "api"]);
    const webUrlEntity = this.config.web_url || this.findEntity("sensor", ["web", "interface"]);
    const webUrlObj = this.stateObj(webUrlEntity);
    const webUrl = webUrlObj?.state && !["unknown", "unavailable", "not configured"].includes(webUrlObj.state) ? webUrlObj.state : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}.wrap{padding:18px}ha-card{overflow:hidden;border-radius:26px;background:radial-gradient(circle at 12% 0%,#093c3a 0,#071d2b 36%,#030b12 100%);border:1px solid rgba(58,199,190,.34);box-shadow:0 0 34px rgba(0,126,145,.18);color:#eefcff;font-family:var(--primary-font-family,Inter,Roboto,Arial,sans-serif)}
        .hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.title{font-size:24px;font-weight:900;color:#8ff5dc;letter-spacing:.2px;text-shadow:0 0 18px rgba(77,225,190,.46)}.sub{font-size:12px;color:#98bfc1;margin-top:4px}.badge{padding:7px 10px;border:1px solid rgba(80,211,181,.28);border-radius:999px;background:rgba(4,30,43,.72);color:#bffcff;font-size:12px}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:16px}.panel{border:1px solid rgba(80,211,181,.18);background:linear-gradient(180deg,rgba(4,28,38,.90),rgba(2,12,18,.90));border-radius:20px;padding:14px;box-shadow:inset 0 0 30px rgba(0,10,18,.92)}.light{grid-column:span 2}.sectionTitle{font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#6ee7d0;margin-bottom:12px}.orbRow{display:flex;align-items:center;gap:18px}.orb{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:1px;border:2px solid rgba(69,194,215,.34);background:radial-gradient(circle,#0a3540 0,#061924 70%);color:#94b8bf;box-shadow:inset 0 0 28px rgba(0,0,0,.85),0 0 20px rgba(0,157,190,.16)}.orb.on{background:radial-gradient(circle,#eaffe9 0,#72f2d6 23%,#1db8d3 58%,#073b45 100%);color:#001a1f;box-shadow:0 0 34px rgba(80,211,181,.62),inset 0 0 18px rgba(255,255,255,.58)}.orb.off{border-color:rgba(69,117,132,.46);color:#89a8b0}.meta{flex:1}.state{font-size:21px;font-weight:900;color:${isOn ? "#a6f2d7" : "#9ebbc1"}}.muted{color:#98bfc1;font-size:12px}.bar{height:12px;background:#020d13;border:1px solid rgba(80,211,181,.28);border-radius:999px;overflow:hidden;margin:12px 0}.bar span{display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#0d93bd,#39cdb5,#9bf7d6);box-shadow:0 0 14px rgba(80,211,181,.62)}.slider{width:100%;accent-color:#39cdb5}.actions,.scenes,.chips{display:flex;flex-wrap:wrap;gap:9px}.btn,.scene{border-radius:14px;padding:11px 14px;font-weight:800;cursor:pointer;background:rgba(5,36,47,.82);color:#c7ffff;border:1px solid rgba(80,211,181,.32);box-shadow:0 0 12px rgba(0,134,148,.08)}.btn:hover,.scene:hover{border-color:#90fff2;box-shadow:0 0 18px rgba(75,224,217,.22)}.btn.primary{background:linear-gradient(135deg,#0d93bd,#39cdb5);color:#001a1f}.btn.off{background:rgba(30,54,66,.95);color:#d8f5fa}.btn.dim{background:linear-gradient(135deg,#1f6072,#84e8dd);color:#001a1f}.scene.active{background:linear-gradient(135deg,#0b7fb6,#39cdb5);color:#001a1f;box-shadow:0 0 24px rgba(65,219,200,.48)}.chip{position:relative;display:grid;grid-template-columns:auto auto 1fr;gap:4px 8px;align-items:center;border-radius:14px;padding:9px 11px;background:rgba(3,19,29,.84);border:1px solid rgba(75,224,217,.18);min-width:138px}.chip b{grid-column:3;font-size:12px;word-break:break-word}.chip.ok b{color:#a0fff0}.chip.standby b{color:#71919a}.led{width:10px;height:10px;border-radius:50%;background:#1b3c48;box-shadow:inset 0 0 6px #000}.chip.ok .led{background:#65def5;box-shadow:0 0 12px #65def5,0 0 24px rgba(93,234,255,.55)}ha-icon{width:18px;color:#66dfe9}.chipLabel{font-size:12px;color:#dafcff}.links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}a{color:#a6f2d7;text-decoration:none}.empty{color:#7f9ca4}.tools{min-height:78px}@media(max-width:650px){.light{grid-column:span 1}.orbRow{flex-direction:column;align-items:flex-start}.orb{width:82px;height:82px}}
      </style>
      <ha-card>
        <div class="wrap">
          <div class="hero"><div><div class="title">${this.config.title || "Casambi Jungle"}</div><div class="sub">${this.friendly(light) || "No light configured"} · Active scene: ${activeScene}</div></div><div class="badge">${this.displayValue("Transport", transport)}</div></div>
          <div class="grid">
            <div class="panel light"><div class="sectionTitle">Light Control</div><div class="orbRow"><div class="orb ${isOn ? "on" : "off"}">${isOn ? "ON" : "OFF"}</div><div class="meta"><div class="state">${isOn ? "Light active" : "Light off"}</div><div class="muted">Brightness ${pct}%</div><div class="bar"><span></span></div><input class="slider" type="range" min="0" max="255" value="${brightness}"></div></div><div class="actions"><button class="btn primary" data-action="on">ON</button><button class="btn off" data-action="off">OFF</button><button class="btn dim" data-action="dim">40%</button></div></div>
            <div class="panel"><div class="sectionTitle">Bridge Status</div><div class="chips">${this.ledChip("Bridge", bridge, "mdi:bridge")} ${this.ledChip("BLE", ble, "mdi:bluetooth")} ${this.ledChip("Transport", transport, "mdi:transit-connection-variant")} ${this.ledChip("API", directApi, "mdi:api")}</div><div class="links">${webUrl ? `<a target="_blank" href="${webUrl}">Open Jungle Control Center</a>` : ""}</div></div>
            <div class="panel"><div class="sectionTitle">Scenes</div><div class="scenes">${scenes.map((entityId) => `<button class="scene ${this.isSceneActive(entityId) ? "active" : ""}" data-scene="${entityId}">${this.stateObj(entityId)?.attributes?.scene_name || this.friendly(entityId)}</button>`).join("") || `<span class="empty">No scene buttons found</span>`}</div></div>
            <div class="panel tools"><div class="sectionTitle">Tools</div><div class="actions">${this.config.api_fetch ? `<button class="btn" data-button="${this.config.api_fetch}">API Fetch</button>` : ""}${this.config.restart ? `<button class="btn" data-button="${this.config.restart}">Restart</button>` : ""}</div></div>
          </div>
        </div>
      </ha-card>`;

    this.shadowRoot.querySelector('[data-action="on"]')?.addEventListener("click", () => this.callLight("ON"));
    this.shadowRoot.querySelector('[data-action="off"]')?.addEventListener("click", () => this.callLight("OFF"));
    this.shadowRoot.querySelector('[data-action="dim"]')?.addEventListener("click", () => this.callLight("ON", 102));
    this.shadowRoot.querySelector(".slider")?.addEventListener("change", (event) => this.callLight("ON", event.target.value));
    this.shadowRoot.querySelectorAll("[data-scene]").forEach((button) => button.addEventListener("click", () => this.pressButton(button.dataset.scene)));
    this.shadowRoot.querySelectorAll("[data-button]").forEach((button) => button.addEventListener("click", () => this.pressButton(button.dataset.button)));
  }
}

class CasambiJungleCardEditor extends HTMLElement {
  constructor() {
    super();
    this.config = cjMergeConfig({});
    this._hasRendered = false;
    this._pickerRefs = [];
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this.config = cjMergeConfig(config || {});
    this._hasRendered = false;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) this.config = cjMergeConfig({});
    if (this._hasRendered) {
      this._pickerRefs.forEach((picker) => { picker.hass = hass; });
      return;
    }
    this.render();
  }

  notify() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.cleanConfig(this.config) }, bubbles: true, composed: true }));
  }

  cleanConfig(config) {
    const cleaned = cjMergeConfig(config || {});
    delete cleaned._scene_picker;
    if (!cleaned.scenes) cleaned.scenes = [];
    if (!cleaned.status_entities) cleaned.status_entities = {};
    return cleaned;
  }

  words(entityId) {
    const states = this._hass?.states || {};
    return `${entityId} ${(states[entityId]?.attributes?.friendly_name || "")} ${(states[entityId]?.attributes?.device_class || "")}`.toLowerCase();
  }

  findBy(domain, must = [], any = [], options = {}) {
    const states = this._hass?.states || {};
    const exclude = options.exclude || [];
    const prefer = options.prefer || ["casambi", "jungle", "bridge"];
    const candidates = Object.keys(states).filter((entityId) => {
      if (!entityId.startsWith(`${domain}.`)) return false;
      const hay = this.words(entityId);
      if (exclude.some((word) => hay.includes(word))) return false;
      const mustOk = must.every((word) => hay.includes(word));
      const anyOk = any.length === 0 || any.some((word) => hay.includes(word));
      return mustOk && anyOk;
    });
    candidates.sort((a, b) => this.scoreEntity(b, prefer) - this.scoreEntity(a, prefer));
    return candidates[0] || "";
  }

  scoreEntity(entityId, prefer = []) {
    const hay = this.words(entityId);
    let score = 0;
    prefer.forEach((word, index) => { if (hay.includes(word)) score += 30 - index; });
    if (hay.includes("shelly")) score -= 200;
    if (hay.includes("restart") || hay.includes("neu starten")) score += 4;
    return score;
  }

  bridgePrefixFromLight(lightEntity) {
    // Current HACS entities often use the bridge/device name as prefix, e.g. sensor.kalli_bridge_status.
    // With only frontend data we cannot always resolve HA device registry reliably, so this keeps a
    // lightweight heuristic and falls back to known Casambi/Jungle words.
    const lightName = this.words(lightEntity || "");
    const known = ["casambi", "jungle", "bridge"];
    return known.filter((word) => lightName.includes(word));
  }

  autoScenes() {
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter((entityId) => entityId.startsWith("button.") && states[entityId].attributes && (states[entityId].attributes.scene_id !== undefined || states[entityId].attributes.scene_name !== undefined))
      .sort((a, b) => (states[a].attributes.scene_id || 0) - (states[b].attributes.scene_id || 0));
  }

  autoConfig() {
    const cfg = cjMergeConfig(this.config || {});
    cfg.light = cfg.light || this.findBy("light", [], ["casambi", "minicontroller", "dim2warm"], { exclude: ["shelly"] });
    const contextWords = this.bridgePrefixFromLight(cfg.light);
    const prefer = [...new Set([...contextWords, "casambi", "jungle", "bridge"])]
    cfg.active_scene = cfg.active_scene || this.findBy("sensor", ["active", "scene"], [], { prefer, exclude: ["shelly"] });
    cfg.status_entities = {
      ...(cfg.status_entities || {}),
      bridge: cfg.status_entities?.bridge || this.findBy("sensor", ["bridge", "status"], [], { prefer, exclude: ["shelly"] }),
      ble: cfg.status_entities?.ble || this.findBy("sensor", ["ble", "status"], [], { prefer, exclude: ["shelly"] }),
      transport: cfg.status_entities?.transport || this.findBy("sensor", ["transport", "mode"], [], { prefer, exclude: ["shelly"] }),
      direct_api: cfg.status_entities?.direct_api || this.findBy("sensor", ["direct", "api"], [], { prefer, exclude: ["shelly"] }),
    };
    cfg.web_url = cfg.web_url || this.findBy("sensor", ["web", "interface"], [], { prefer, exclude: ["shelly"] });
    cfg.api_fetch = cfg.api_fetch || this.findBy("button", ["api", "fetch"], [], { prefer, exclude: ["shelly"] });
    // Important: never pick generic Shelly or other vendor restart buttons.
    // Only accept restart buttons that also look like Casambi/Jungle/Kalli/Bridge.
    cfg.restart = cfg.restart || this.findBy("button", ["restart"], ["casambi", "bridge", "jungle"], { prefer, exclude: ["shelly", "plus2pm", "shellyplus", "neu starten"] });
    if (!cfg.scenes || cfg.scenes.length === 0) cfg.scenes = this.autoScenes().filter((entityId) => !this.words(entityId).includes("shelly"));
    this.config = cfg;
    this.notify();
    this._hasRendered = false;
    this.render();
  }

  label(text) {
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = text;
    return label;
  }

  picker(labelText, path, domain, value) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.appendChild(this.label(labelText));
    const picker = document.createElement("ha-entity-picker");
    picker.hass = this._hass;
    picker.value = value || "";
    if (domain) picker.includeDomains = [domain];
    picker.allowCustomEntity = true;
    picker.addEventListener("value-changed", (event) => {
      const next = event.detail.value || "";
      if (path === "_scene_picker") {
        this.addScene(next);
        picker.value = "";
        return;
      }
      this.setPathWithoutRender(path, next);
    });
    this._pickerRefs.push(picker);
    wrap.appendChild(picker);
    return wrap;
  }

  text(labelText, path, value, placeholder = "") {
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.appendChild(this.label(labelText));
    const input = document.createElement("input");
    input.value = value || "";
    input.placeholder = placeholder;
    input.addEventListener("change", (event) => this.setPathWithoutRender(path, event.target.value));
    wrap.appendChild(input);
    return wrap;
  }

  setPathWithoutRender(path, value) {
    const parts = path.split(".");
    const config = cjMergeConfig(this.config || {});
    let ref = config;
    for (let index = 0; index < parts.length - 1; index++) {
      ref[parts[index]] = { ...(ref[parts[index]] || {}) };
      ref = ref[parts[index]];
    }
    ref[parts[parts.length - 1]] = value;
    this.config = config;
    this.notify();
  }

  addScene(entity) {
    if (!entity) return;
    const scenes = [...(this.config?.scenes || [])];
    if (!scenes.includes(entity)) scenes.push(entity);
    this.config = { ...cjMergeConfig(this.config), scenes };
    this.notify();
    this.renderSceneList();
  }

  removeScene(entity) {
    this.config = { ...cjMergeConfig(this.config), scenes: (this.config?.scenes || []).filter((item) => item !== entity) };
    this.notify();
    this.renderSceneList();
  }

  renderSceneList() {
    const list = this.shadowRoot?.querySelector("#scene-list");
    if (!list) return;
    list.innerHTML = "";
    const scenes = this.config?.scenes || [];
    scenes.forEach((entity) => {
      const row = document.createElement("div");
      row.className = "sceneRow";
      const code = document.createElement("code");
      code.textContent = entity;
      const button = document.createElement("button");
      button.className = "remove";
      button.textContent = "Remove";
      button.addEventListener("click", () => this.removeScene(entity));
      row.appendChild(code);
      row.appendChild(button);
      list.appendChild(row);
    });
  }

  render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._hass) {
      this.shadowRoot.innerHTML = "<div>Loading...</div>";
      return;
    }
    if (!this.config) this.config = cjMergeConfig({});
    const config = cjMergeConfig(this.config);
    this._pickerRefs = [];
    this.shadowRoot.innerHTML = `
      <style>
        .box{padding:2px 0}.field{margin:12px 0}.label{font-weight:700;margin-bottom:5px;color:var(--primary-text-color)}
        input{width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
        .section{margin-top:18px;padding-top:12px;border-top:1px solid var(--divider-color);font-weight:900;color:#58d7c4;text-transform:uppercase;letter-spacing:.04em}
        .sceneRow{display:flex;gap:8px;align-items:center;margin:6px 0}.sceneRow code{flex:1;overflow:hidden;text-overflow:ellipsis}.remove,.auto{background:#092332;color:#d5ffff;border:1px solid #27606b;border-radius:8px;padding:8px 10px}.auto{width:100%;font-weight:900;margin:8px 0 14px;cursor:pointer;background:linear-gradient(135deg,#0b3542,#0d5d58)}.hint{font-size:12px;color:var(--secondary-text-color);margin-top:8px}
      </style><div class="box"></div>`;
    const box = this.shadowRoot.querySelector(".box");
    const auto = document.createElement("button"); auto.className = "auto"; auto.textContent = "Auto-detect Casambi entities"; auto.addEventListener("click", () => this.autoConfig()); box.appendChild(auto);
    box.appendChild(this.text("Title", "title", config.title, "Casambi Jungle"));
    box.appendChild(this.picker("Light entity", "light", "light", config.light));
    box.appendChild(this.picker("Active scene sensor", "active_scene", "sensor", config.active_scene));
    const status = document.createElement("div"); status.className = "section"; status.textContent = "Status LEDs"; box.appendChild(status);
    box.appendChild(this.picker("Bridge status sensor", "status_entities.bridge", "sensor", config.status_entities.bridge));
    box.appendChild(this.picker("BLE status sensor", "status_entities.ble", "sensor", config.status_entities.ble));
    box.appendChild(this.picker("Transport mode sensor", "status_entities.transport", "sensor", config.status_entities.transport));
    box.appendChild(this.picker("Direct API sensor", "status_entities.direct_api", "sensor", config.status_entities.direct_api));
    const tools = document.createElement("div"); tools.className = "section"; tools.textContent = "Links and tools"; box.appendChild(tools);
    box.appendChild(this.picker("Web UI URL sensor", "web_url", "sensor", config.web_url));
    box.appendChild(this.picker("API Fetch button", "api_fetch", "button", config.api_fetch));
    box.appendChild(this.picker("Restart button", "restart", "button", config.restart));
    const scenesTitle = document.createElement("div"); scenesTitle.className = "section"; scenesTitle.textContent = "Scene buttons"; box.appendChild(scenesTitle);
    box.appendChild(this.picker("Add scene button", "_scene_picker", "button", ""));
    const list = document.createElement("div"); list.id = "scene-list"; box.appendChild(list);
    const hint = document.createElement("div"); hint.className = "hint"; hint.textContent = "Press auto-detect to fill the YAML. Auto-detect prefers entities belonging to the selected Casambi light and avoids unrelated devices like Shelly."; box.appendChild(hint);
    this._hasRendered = true;
    this.renderSceneList();
  }
}

customElements.define("casambi-jungle-card", CasambiJungleCard);
customElements.define("casambi-jungle-card-editor", CasambiJungleCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "casambi-jungle-card", name: "Casambi Jungle Card", description: "Dark jungle blue-green card with auto-detect for Casambi Jungle Bridge" });
