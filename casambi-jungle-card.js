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
  state(entity) { return this.stateObj(entity)?.state ?? "unknown"; }
  friendly(entity) { const o = this.stateObj(entity); return o?.attributes?.friendly_name || entity || ""; }

  findEntity(domain, contains = ["casambi", "jungle"]) {
    const states = this._hass?.states || {};
    return Object.keys(states).find((e) => {
      if (!e.startsWith(`${domain}.`)) return false;
      const hay = `${e} ${(states[e].attributes?.friendly_name || "")}`.toLowerCase();
      return contains.some((needle) => hay.includes(needle));
    }) || "";
  }

  autoLight() {
    return this.config.light || this.findEntity("light") || Object.keys(this._hass?.states || {}).find(e => e.startsWith("light.")) || "";
  }

  autoStatusKey(key, candidates) {
    const configured = this.config.status_entities?.[key];
    if (configured) return configured;
    const states = this._hass?.states || {};
    return Object.keys(states).find((e) => {
      if (!e.startsWith("sensor.")) return false;
      const hay = `${e} ${(states[e].attributes?.friendly_name || "")}`.toLowerCase();
      return candidates.every((needle) => hay.includes(needle));
    }) || "";
  }

  sceneEntities() {
    if (Array.isArray(this.config.scenes) && this.config.scenes.length) return this.config.scenes;
    const states = this._hass?.states || {};
    return Object.keys(states)
      .filter(e => e.startsWith("button.") && states[e].attributes && (states[e].attributes.scene_id !== undefined || states[e].attributes.scene_name !== undefined))
      .sort((a,b) => (states[a].attributes.scene_id || 0) - (states[b].attributes.scene_id || 0));
  }

  activeSceneName() {
    const activeEntity = this.config.active_scene || this.findEntity("sensor", ["active", "scene"]);
    const st = this.state(activeEntity);
    if (activeEntity && st && !["unknown", "unavailable", "none", ""].includes(String(st).toLowerCase())) return st;
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

  pressButton(entity) { if (entity) this._hass.callService("button", "press", { entity_id: entity }); }

  ledChip(label, entity, icon) {
    const obj = this.stateObj(entity);
    const value = obj?.state || "unknown";
    const normalized = String(value).toLowerCase();
    const good = ["on", "online", "connected", "direct", "hybrid", "mqtt"].includes(normalized) || (label === "API" && !["unknown", "unavailable", "not configured"].includes(normalized));
    return `
      <div class="chip ${good ? "ok" : "bad"}">
        <span class="led"></span>
        <ha-icon icon="${icon}"></ha-icon>
        <span class="chipLabel">${label}</span>
        <b>${value}</b>
      </div>`;
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
    const bridge = se.bridge || this.autoStatusKey("bridge", ["bridge", "status"]);
    const ble = se.ble || this.autoStatusKey("ble", ["ble"]);
    const transport = se.transport || this.autoStatusKey("transport", ["transport"]);
    const directApi = se.direct_api || this.autoStatusKey("direct_api", ["direct", "api"]);
    const webUrlEntity = this.config.web_url || this.findEntity("sensor", ["web", "interface"]);
    const webUrlObj = this.stateObj(webUrlEntity);
    const webUrl = webUrlObj?.state && !["unknown", "unavailable", "not configured"].includes(webUrlObj.state) ? webUrlObj.state : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block}.wrap{padding:18px}ha-card{overflow:hidden;border-radius:26px;background:radial-gradient(circle at 12% 0%,#0c3b73 0,#071b33 34%,#020817 100%);border:1px solid rgba(31,182,255,.42);box-shadow:0 0 34px rgba(0,151,255,.24);color:#eef8ff;font-family:var(--primary-font-family,Inter,Roboto,Arial,sans-serif)}
        .hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.title{font-size:24px;font-weight:900;color:#81d8ff;letter-spacing:.2px;text-shadow:0 0 18px rgba(49,192,255,.65)}.sub{font-size:12px;color:#9dbbd2;margin-top:4px}.badge{padding:7px 10px;border:1px solid rgba(31,182,255,.35);border-radius:999px;background:rgba(6,31,58,.7);color:#bdeaff;font-size:12px}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:16px}.panel{border:1px solid rgba(31,182,255,.23);background:linear-gradient(180deg,rgba(4,20,39,.88),rgba(2,10,22,.88));border-radius:20px;padding:14px;box-shadow:inset 0 0 30px rgba(3,14,29,.9)}.light{grid-column:span 2}.sectionTitle{font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#55cfff;margin-bottom:12px}.orbRow{display:flex;align-items:center;gap:18px}.orb{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:1px;border:2px solid rgba(76,185,255,.35);background:radial-gradient(circle,#0c2545 0,#061326 70%);color:#8fbddf;box-shadow:inset 0 0 28px rgba(0,0,0,.85),0 0 20px rgba(0,126,255,.18)}.orb.on{background:radial-gradient(circle,#eefbff 0,#55cfff 24%,#0076d6 62%,#062348 100%);color:#001427;box-shadow:0 0 34px rgba(67,199,255,.85),inset 0 0 18px rgba(255,255,255,.62)}.orb.off{border-color:rgba(71,118,159,.46);color:#87a9c6}.meta{flex:1}.state{font-size:21px;font-weight:900;color:${isOn ? "#88ddff" : "#9eb7cc"}}.muted{color:#9dbbd2;font-size:12px}.bar{height:12px;background:#020917;border:1px solid rgba(31,182,255,.34);border-radius:999px;overflow:hidden;margin:12px 0}.bar span{display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#0086ff,#55cfff,#b4f1ff);box-shadow:0 0 14px rgba(85,207,255,.85)}.slider{width:100%;accent-color:#55cfff}.actions,.scenes,.chips{display:flex;flex-wrap:wrap;gap:9px}.btn,.scene{border-radius:14px;padding:11px 14px;font-weight:800;cursor:pointer;background:rgba(6,31,58,.85);color:#bdeaff;border:1px solid rgba(31,182,255,.45);box-shadow:0 0 12px rgba(0,134,255,.08)}.btn:hover,.scene:hover{border-color:#85dcff;box-shadow:0 0 18px rgba(85,207,255,.28)}.btn.primary{background:linear-gradient(135deg,#0086ff,#55cfff);color:#001427}.btn.off{background:rgba(36,51,70,.95);color:#d3eaff}.btn.dim{background:linear-gradient(135deg,#26557e,#89d9ff);color:#001427}.scene.active{background:linear-gradient(135deg,#004dbe,#55cfff);color:#001427;box-shadow:0 0 24px rgba(85,207,255,.55)}.chip{position:relative;display:grid;grid-template-columns:auto auto 1fr;gap:4px 8px;align-items:center;border-radius:14px;padding:9px 11px;background:rgba(3,15,31,.84);border:1px solid rgba(31,182,255,.22);min-width:138px}.chip b{grid-column:3;font-size:12px}.chip.ok b{color:#8de4ff}.chip.bad b{color:#6f879b}.led{width:10px;height:10px;border-radius:50%;background:#23425d;box-shadow:inset 0 0 6px #000}.chip.ok .led{background:#55cfff;box-shadow:0 0 12px #55cfff,0 0 24px rgba(85,207,255,.6)}ha-icon{width:18px;color:#55cfff}.chipLabel{font-size:12px;color:#d9f3ff}.links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}a{color:#88ddff;text-decoration:none}.empty{color:#7f9ab0}.tools{min-height:78px}
      </style>
      <ha-card>
        <div class="wrap">
          <div class="hero"><div><div class="title">${this.config.title || "Casambi Jungle"}</div><div class="sub">${this.friendly(light) || "No light configured"} · Active scene: ${activeScene}</div></div><div class="badge">${this.state(transport)}</div></div>
          <div class="grid">
            <div class="panel light"><div class="sectionTitle">Light Control</div><div class="orbRow"><div class="orb ${isOn ? "on" : "off"}">${isOn ? "ON" : "OFF"}</div><div class="meta"><div class="state">${isOn ? "Light active" : "Light off"}</div><div class="muted">Brightness ${pct}%</div><div class="bar"><span></span></div><input class="slider" type="range" min="0" max="255" value="${brightness}"></div></div><div class="actions"><button class="btn primary" data-action="on">ON</button><button class="btn off" data-action="off">OFF</button><button class="btn dim" data-action="dim">40%</button></div></div>
            <div class="panel"><div class="sectionTitle">Bridge Status</div><div class="chips">${this.ledChip("Bridge",bridge,"mdi:bridge")} ${this.ledChip("BLE",ble,"mdi:bluetooth")} ${this.ledChip("Transport",transport,"mdi:transit-connection-variant")} ${this.ledChip("API",directApi,"mdi:api")}</div><div class="links">${webUrl ? `<a target="_blank" href="${webUrl}">Open Jungle Control Center</a>`:""}</div></div>
            <div class="panel"><div class="sectionTitle">Scenes</div><div class="scenes">${scenes.map(e=>`<button class="scene ${this.isSceneActive(e)?"active":""}" data-scene="${e}">${this.stateObj(e)?.attributes?.scene_name || this.friendly(e)}</button>`).join("") || `<span class="empty">No scene buttons found</span>`}</div></div>
            <div class="panel tools"><div class="sectionTitle">Tools</div><div class="actions">${this.config.api_fetch?`<button class="btn" data-button="${this.config.api_fetch}">API Fetch</button>`:""}${this.config.restart?`<button class="btn" data-button="${this.config.restart}">Restart</button>`:""}</div></div>
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
  setConfig(config){this.config={title:"Casambi Jungle",scenes:[],status_entities:{},...config};this.render();}
  set hass(hass){this._hass=hass;this.render();}
  notify(){this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));}
  label(text){const l=document.createElement('div');l.className='label';l.textContent=text;return l;}
  picker(label,key,domain,value){const wrap=document.createElement('div');wrap.className='field';wrap.appendChild(this.label(label));const p=document.createElement('ha-entity-picker');p.hass=this._hass;p.value=value||'';if(domain)p.includeDomains=[domain];p.allowCustomEntity=true;p.addEventListener('value-changed',e=>{this.setPath(key,e.detail.value||'');});wrap.appendChild(p);return wrap;}
  text(label,key,value,placeholder=''){const wrap=document.createElement('div');wrap.className='field';wrap.appendChild(this.label(label));const input=document.createElement('input');input.value=value||'';input.placeholder=placeholder;input.addEventListener('change',e=>this.setPath(key,e.target.value));wrap.appendChild(input);return wrap;}
  setPath(path,value){const parts=path.split('.');const cfg={...this.config,status_entities:{...(this.config.status_entities||{})}};let ref=cfg;for(let i=0;i<parts.length-1;i++){ref[parts[i]]={...(ref[parts[i]]||{})};ref=ref[parts[i]];}ref[parts[parts.length-1]]=value;this.config=cfg;this.notify();this.render();}
  addScene(entity){if(!entity)return;const scenes=[...(this.config.scenes||[])];if(!scenes.includes(entity))scenes.push(entity);this.config={...this.config,scenes};this.notify();this.render();}
  removeScene(entity){this.config={...this.config,scenes:(this.config.scenes||[]).filter(e=>e!==entity)};this.notify();this.render();}
  render(){if(!this.shadowRoot)this.attachShadow({mode:'open'});if(!this._hass){this.shadowRoot.innerHTML='<div>Loading...</div>';return;}this.shadowRoot.innerHTML='<style>.box{padding:2px 0}.field{margin:12px 0}.label{font-weight:700;margin-bottom:5px;color:var(--primary-text-color)}input{width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}.section{margin-top:18px;padding-top:12px;border-top:1px solid var(--divider-color);font-weight:900;color:var(--primary-color)}.sceneRow{display:flex;gap:8px;align-items:center;margin:6px 0}.sceneRow code{flex:1}.remove{background:#17324f;color:#bdeaff;border:1px solid #315f88;border-radius:8px;padding:6px 9px}.hint{font-size:12px;color:var(--secondary-text-color);margin-top:8px}</style><div class="box"></div>';const box=this.shadowRoot.querySelector('.box');box.appendChild(this.text('Title','title',this.config.title,'Casambi Jungle'));box.appendChild(this.picker('Light entity','light','light',this.config.light));box.appendChild(this.picker('Active scene sensor','active_scene','sensor',this.config.active_scene));const s=document.createElement('div');s.className='section';s.textContent='Status LEDs';box.appendChild(s);box.appendChild(this.picker('Bridge status sensor','status_entities.bridge','sensor',this.config.status_entities?.bridge));box.appendChild(this.picker('BLE status sensor','status_entities.ble','sensor',this.config.status_entities?.ble));box.appendChild(this.picker('Transport mode sensor','status_entities.transport','sensor',this.config.status_entities?.transport));box.appendChild(this.picker('Direct API sensor','status_entities.direct_api','sensor',this.config.status_entities?.direct_api));const l=document.createElement('div');l.className='section';l.textContent='Links and tools';box.appendChild(l);box.appendChild(this.picker('Web UI URL sensor','web_url','sensor',this.config.web_url));box.appendChild(this.picker('API Fetch button','api_fetch','button',this.config.api_fetch));box.appendChild(this.picker('Restart button','restart','button',this.config.restart));const sc=document.createElement('div');sc.className='section';sc.textContent='Scene buttons';box.appendChild(sc);const selectWrap=this.picker('Add scene button','_scene_picker','button','');box.appendChild(selectWrap);selectWrap.querySelector('ha-entity-picker').addEventListener('value-changed',e=>this.addScene(e.detail.value));(this.config.scenes||[]).forEach(entity=>{const row=document.createElement('div');row.className='sceneRow';row.innerHTML=`<code>${entity}</code>`;const btn=document.createElement('button');btn.className='remove';btn.textContent='Remove';btn.addEventListener('click',()=>this.removeScene(entity));row.appendChild(btn);box.appendChild(row);});const hint=document.createElement('div');hint.className='hint';hint.textContent='If no scenes are selected, the card auto-detects scene buttons from the HACS integration.';box.appendChild(hint);}
}
customElements.define('casambi-jungle-card', CasambiJungleCard);
customElements.define('casambi-jungle-card-editor', CasambiJungleCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({type:'casambi-jungle-card',name:'Casambi Jungle Card',description:'Dark-blue control card for Casambi Jungle Bridge'});
