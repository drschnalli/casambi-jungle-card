class CasambiJungleCard extends HTMLElement {
  static getStubConfig() {
    return {
      title: "Casambi Jungle",
      light: "",
      active_scene: "",
      scenes: [],
      status_entities: {},
      web_url: "",
      api_fetch: "",
      restart: ""
    };
  }
  static getConfigElement() {
    return document.createElement("casambi-jungle-card-editor");
  }
  setConfig(config) {
    this.config = {
      title: "Casambi Jungle",
      scenes: [],
      status_entities: {},
      ...config
    };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }
  set hass(hass) {
    this._hass = hass;
    this.render();
  }
  getCardSize() { return 5; }
  stateObj(entity) { return entity ? this._hass?.states?.[entity] : undefined; }
  friendly(entity) {
    const o = this.stateObj(entity);
    return o?.attributes?.friendly_name || entity || "";
  }
  autoLight() {
    if (this.config.light) return this.config.light;
    const states = this._hass?.states || {};
    const found = Object.keys(states).find(e => e.startsWith("light.") && (e.includes("casambi") || (states[e].attributes?.friendly_name || "").toLowerCase().includes("casambi")));
    return found || Object.keys(states).find(e => e.startsWith("light.")) || "";
  }
  sceneEntities() {
    if (Array.isArray(this.config.scenes) && this.config.scenes.length) return this.config.scenes;
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter(e => e.startsWith("button.") && states[e].attributes && (states[e].attributes.scene_id !== undefined || states[e].attributes.scene_name !== undefined))
      .sort((a,b) => (states[a].attributes.scene_id || 0) - (states[b].attributes.scene_id || 0));
  }
  entityState(entity) { return this.stateObj(entity)?.state ?? "unknown"; }
  activeSceneName() {
    const activeEntity = this.config.active_scene;
    const st = this.entityState(activeEntity);
    if (activeEntity && st && st !== "unknown" && st !== "unavailable" && st !== "none") return st;
    const activeButton = this.sceneEntities().find(e => this.stateObj(e)?.attributes?.active === true);
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
    if (state === "OFF") this._hass.callService("light", "turn_off", { entity_id: entity });
    else {
      const data = { entity_id: entity };
      if (brightness !== undefined) data.brightness = Number(brightness);
      this._hass.callService("light", "turn_on", data);
    }
  }
  pressButton(entity) {
    if (entity) this._hass.callService("button", "press", { entity_id: entity });
  }
  statusChip(label, entity, fallbackIcon) {
    const obj = this.stateObj(entity);
    const state = obj?.state || "unknown";
    const good = ["on","online","connected","hybrid","direct","mqtt"].includes(String(state).toLowerCase()) || (label === "API" && state !== "unknown" && state !== "unavailable");
    return `<div class="chip ${good ? "ok" : "bad"}"><ha-icon icon="${fallbackIcon}"></ha-icon><span>${label}</span><b>${state}</b></div>`;
  }
  render() {
    if (!this.shadowRoot || !this._hass) return;
    const light = this.autoLight();
    const lightObj = this.stateObj(light);
    const isOn = lightObj?.state === "on";
    const brightness = lightObj?.attributes?.brightness || 0;
    const pct = this.pct(brightness);
    const activeScene = this.activeSceneName();
    const scenes = this.sceneEntities();
    const se = this.config.status_entities || {};
    const webUrlObj = this.stateObj(this.config.web_url);
    const webUrl = webUrlObj?.state && !["unknown","unavailable","not configured"].includes(webUrlObj.state) ? webUrlObj.state : "";
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block} ha-card{overflow:hidden;border-radius:24px;background:radial-gradient(circle at 10% 0%,#124326 0,#06170f 38%,#020604 100%);border:1px solid rgba(20,241,149,.45);box-shadow:0 0 28px rgba(20,241,149,.22);color:#eafff4;font-family:var(--primary-font-family,Consolas,monospace)}
        .wrap{padding:18px}.hero{display:flex;align-items:center;justify-content:space-between;gap:12px}.title{font-size:24px;font-weight:900;color:#14f195;text-shadow:0 0 18px rgba(20,241,149,.7)}.sub{font-size:12px;color:#8fbba5;margin-top:3px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:14px}.panel{border:1px solid rgba(20,241,149,.25);background:rgba(2,10,7,.7);border-radius:18px;padding:14px}.light{grid-column:span 2}.orbRow{display:flex;align-items:center;gap:18px}.orb{width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:1px;border:2px solid #24543d;background:#06140d;color:#8fbba5;box-shadow:inset 0 0 24px #000}.orb.on{background:radial-gradient(circle,#b6ff4d 0,#14f195 46%,#004f2f 100%);color:#001208;box-shadow:0 0 32px rgba(20,241,149,.8),inset 0 0 18px rgba(255,255,255,.45)}.orb.off{border-color:rgba(255,77,125,.45);color:#ff7fa0}.meta{flex:1}.state{font-size:20px;font-weight:900;color:${isOn ? "#14f195" : "#ff4d7d"}}.muted{color:#8fbba5;font-size:12px}.bar{height:12px;background:#03110b;border:1px solid rgba(20,241,149,.35);border-radius:999px;overflow:hidden;margin:12px 0}.bar span{display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#14f195,#b6ff4d,#00e5ff);box-shadow:0 0 14px #14f195}.slider{width:100%;accent-color:#14f195}.actions,.scenes,.chips{display:flex;flex-wrap:wrap;gap:8px}.btn,.scene{border:none;border-radius:14px;padding:11px 14px;font-weight:900;cursor:pointer;background:#082216;color:#14f195;border:1px solid rgba(20,241,149,.45)}.btn.on{background:linear-gradient(135deg,#14f195,#b6ff4d);color:#001208}.btn.off{background:linear-gradient(135deg,#ff4d7d,#ff9bb8);color:#190006}.btn.dim{background:linear-gradient(135deg,#ffcc66,#ffeeb0);color:#1e1200}.scene.active{background:linear-gradient(135deg,#8a5cf6,#14f195);color:#001208;box-shadow:0 0 22px rgba(138,92,246,.65)}.chip{display:grid;grid-template-columns:auto 1fr;gap:4px 7px;align-items:center;border-radius:12px;padding:8px 10px;background:#06140d;border:1px solid rgba(20,241,149,.25);min-width:125px}.chip b{grid-column:2;font-size:12px}.chip.ok b{color:#b6ff4d}.chip.bad b{color:#ff4d7d}ha-icon{width:18px;color:#14f195}.sectionTitle{font-size:14px;font-weight:900;color:#00e5ff;margin-bottom:10px}.links{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}a{color:#14f195;text-decoration:none}
      </style>
      <ha-card>
        <div class="wrap">
          <div class="hero"><div><div class="title">🌴 ${this.config.title || "Casambi Jungle"}</div><div class="sub">${this.friendly(light) || "No light configured"} · Active scene: ${activeScene}</div></div></div>
          <div class="grid">
            <div class="panel light"><div class="sectionTitle">Light Control</div><div class="orbRow"><div class="orb ${isOn ? "on" : "off"}">${isOn ? "ON" : "OFF"}</div><div class="meta"><div class="state">${isOn ? "Licht aktiv" : "Licht aus"}</div><div class="muted">Brightness ${pct}%</div><div class="bar"><span></span></div><input class="slider" type="range" min="0" max="255" value="${brightness}"></div></div><div class="actions"><button class="btn on" data-action="on">ON</button><button class="btn off" data-action="off">OFF</button><button class="btn dim" data-action="dim">40%</button></div></div>
            <div class="panel"><div class="sectionTitle">Bridge Status</div><div class="chips">${this.statusChip("Bridge",se.bridge,"mdi:bridge")} ${this.statusChip("BLE",se.ble,"mdi:bluetooth")} ${this.statusChip("Transport",se.transport,"mdi:transit-connection-variant")} ${this.statusChip("API",se.direct_api,"mdi:api")}</div><div class="links">${webUrl ? `<a target="_blank" href="${webUrl}">Open Jungle Control Center</a>`:""}</div></div>
            <div class="panel"><div class="sectionTitle">Scenes</div><div class="scenes">${scenes.map(e=>`<button class="scene ${this.isSceneActive(e)?"active":""}" data-scene="${e}">${this.stateObj(e)?.attributes?.scene_name || this.friendly(e)}</button>`).join("") || `<span class="muted">No scene buttons found</span>`}</div></div>
            <div class="panel"><div class="sectionTitle">Tools</div><div class="actions">${this.config.api_fetch?`<button class="btn" data-button="${this.config.api_fetch}">API Fetch</button>`:""}${this.config.restart?`<button class="btn" data-button="${this.config.restart}">Restart</button>`:""}</div></div>
          </div>
        </div>
      </ha-card>`;
    this.shadowRoot.querySelector('[data-action="on"]')?.addEventListener('click',()=>this.callLight('ON'));
    this.shadowRoot.querySelector('[data-action="off"]')?.addEventListener('click',()=>this.callLight('OFF'));
    this.shadowRoot.querySelector('[data-action="dim"]')?.addEventListener('click',()=>this.callLight('ON',102));
    this.shadowRoot.querySelector('.slider')?.addEventListener('change',e=>this.callLight('ON',e.target.value));
    this.shadowRoot.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>this.pressButton(b.dataset.scene)));
    this.shadowRoot.querySelectorAll('[data-button]').forEach(b=>b.addEventListener('click',()=>this.pressButton(b.dataset.button)));
  }
}
class CasambiJungleCardEditor extends HTMLElement {
  setConfig(config){this.config={...config};this.render();}
  set hass(hass){this._hass=hass;this.render();}
  fire(){this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));}
  field(key,label,placeholder=''){return `<label>${label}<input data-key="${key}" value="${this.config?.[key]||''}" placeholder="${placeholder}"></label>`;}
  render(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.shadowRoot.innerHTML=`<style>label{display:block;margin:10px 0;color:var(--primary-text-color)}input,textarea{width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}small{color:var(--secondary-text-color)}</style>${this.field('title','Title','Casambi Jungle')}${this.field('light','Light entity','light.xxx')}${this.field('active_scene','Active scene sensor','sensor.xxx_active_scene')}${this.field('api_fetch','API Fetch button','button.xxx_api_fetch')}${this.field('restart','Restart button','button.xxx_restart_bridge')}<label>Scenes, comma separated<textarea data-key="scenesText" rows="3">${Array.isArray(this.config?.scenes)?this.config.scenes.join(', '):''}</textarea></label><small>Status entities can still be configured in YAML under status_entities.</small>`;this.shadowRoot.querySelectorAll('input').forEach(i=>i.addEventListener('change',e=>{this.config={...this.config,[e.target.dataset.key]:e.target.value};this.fire();}));this.shadowRoot.querySelector('textarea')?.addEventListener('change',e=>{this.config={...this.config,scenes:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)};this.fire();});}
}
customElements.define('casambi-jungle-card', CasambiJungleCard);
customElements.define('casambi-jungle-card-editor', CasambiJungleCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({type:'casambi-jungle-card',name:'Casambi Jungle Card',description:'Jungle/neon control card for Casambi Jungle Bridge'});
