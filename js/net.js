/* =========================================================================
 * TanksALot — Networking (beta)
 * Online co-op is host-authoritative: the HOST runs the full simulation and
 * streams compact world snapshots; the GUEST streams its input command and
 * renders the snapshots. Everything rides on a tiny Transport interface, so
 * the whole protocol is testable over an in-process LoopbackTransport, while
 * RtcTransport carries it over real WebRTC (serverless, copy-paste signaling).
 *
 * Transport: { open, onmessage(obj), onopen(), onclose(), send(obj), close() }
 * ====================================================================== */

'use strict';

// In-process transport: deterministic, used for tests and same-tab demos.
class LoopbackTransport {
  constructor() { this.open = true; this.onmessage = null; this.onopen = null; this.onclose = null; this._peer = null; }
  static pair() { const a = new LoopbackTransport(), b = new LoopbackTransport(); a._peer = b; b._peer = a; return [a, b]; }
  send(obj) { const peer = this._peer; if (peer && peer.onmessage) peer.onmessage(obj); }
  close() { this.open = false; if (this.onclose) this.onclose(); }
}

// Real peer-to-peer over WebRTC with manual (copy-paste) signaling + a public
// STUN server. No backend required; works from GitHub Pages.
class RtcTransport {
  constructor() { this.open = false; this.onmessage = null; this.onopen = null; this.onclose = null; this.pc = null; this.dc = null; }
  _setup(dc) {
    this.dc = dc;
    dc.onopen = () => { this.open = true; if (this.onopen) this.onopen(); };
    dc.onclose = () => { this.open = false; if (this.onclose) this.onclose(); };
    dc.onmessage = (e) => { try { if (this.onmessage) this.onmessage(JSON.parse(e.data)); } catch (_) {} };
  }
  _pc() { const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] }); this.pc = pc; return pc; }
  _waitIce(pc) {
    return new Promise((res) => {
      if (pc.iceGatheringState === 'complete') return res();
      const check = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); res(); } };
      pc.addEventListener('icegatheringstatechange', check); setTimeout(res, 3500);
    });
  }
  async createOffer() { const pc = this._pc(); this._setup(pc.createDataChannel('game', { ordered: true })); const o = await pc.createOffer(); await pc.setLocalDescription(o); await this._waitIce(pc); return btoa(JSON.stringify(pc.localDescription)); }
  async acceptOfferCreateAnswer(b64) { const pc = this._pc(); pc.ondatachannel = (e) => this._setup(e.channel); await pc.setRemoteDescription(JSON.parse(atob(b64))); const a = await pc.createAnswer(); await pc.setLocalDescription(a); await this._waitIce(pc); return btoa(JSON.stringify(pc.localDescription)); }
  async acceptAnswer(b64) { await this.pc.setRemoteDescription(JSON.parse(atob(b64))); }
  send(obj) { if (this.dc && this.dc.readyState === 'open') { try { this.dc.send(JSON.stringify(obj)); } catch (_) {} } }
  close() { try { if (this.dc) this.dc.close(); if (this.pc) this.pc.close(); } catch (_) {} this.open = false; }
}

// Fills the host's player-2 command from the latest command received from the
// remote guest. Edge actions (dash/shock/ult/weapon) are consumed once so a
// single remote press isn't replayed across multiple host frames.
class NetworkController {
  constructor(game) { this.game = game; }
  fill(p) {
    const c = p.command, s = this.game.remoteCmd;
    if (!s) { c.mx = c.my = 0; c.fire = false; c.dash = c.shock = c.ult = false; c.cycle = 0; c.select = -1; return; }
    c.mx = s.mx || 0; c.my = s.my || 0; if (s.aim != null) c.aimAngle = s.aim; c.fire = !!s.fire;
    c.dash = !!s.dash; if (s.dash) s.dash = false;
    c.shock = !!s.shock; if (s.shock) s.shock = false;
    c.ult = !!s.ult; if (s.ult) s.ult = false;
    c.cycle = s.cycle || 0; s.cycle = 0;
    c.select = (s.select != null) ? s.select : -1; s.select = -1;
  }
}
