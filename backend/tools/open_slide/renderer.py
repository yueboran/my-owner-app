"""Validated, escaped data -> standalone HTML; no model-generated code execution."""
from html import escape
import json
import unicodedata
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

THEMES = {
    "noir-signal": {"name": "黑金信号", "bg": "#111212", "paper": "#1d1f20", "ink": "#f5f0e8", "muted": "#b8bbb6", "accent": "#ff773e", "font": "sans-serif"},
    "cobalt-editorial": {"name": "钴蓝编辑", "bg": "#eef2ff", "paper": "#fff", "ink": "#132047", "muted": "#5f6e8f", "accent": "#345af0", "font": "sans-serif"},
    "paper-narrative": {"name": "纸上叙事", "bg": "#eee9df", "paper": "#faf7f0", "ink": "#2e342c", "muted": "#737968", "accent": "#ba5132", "font": "serif"},
}

class Spec(BaseModel):
    model_config = ConfigDict(extra="forbid")

class Item(Spec):
    label: str = Field(max_length=50)
    text: str = Field(max_length=260)

class Node(Spec):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,24}$")
    label: str = Field(max_length=24)
    detail: str = Field(default="", max_length=40)

class Edge(Spec):
    source: str
    target: str
    label: str = Field(default="", max_length=24)

class Datum(Spec):
    label: str = Field(max_length=40)
    value: float = Field(allow_inf_nan=False)

class Page(Spec):
    kind: Literal["cover", "content", "comparison", "process", "architecture", "chart", "quote"]
    title: str = Field(max_length=80)
    kicker: str = Field(default="", max_length=40)
    body: str = Field(default="", max_length=600)
    items: list[Item] = Field(default_factory=list, max_length=4)
    nodes: list[Node] = Field(default_factory=list, max_length=6)
    edges: list[Edge] = Field(default_factory=list, max_length=10)
    data: list[Datum] = Field(default_factory=list, max_length=6)
    unit: str = Field(default="", max_length=20)
    note: str = Field(default="", max_length=250)

    @model_validator(mode="after")
    def coherent(self):
        ids = {n.id for n in self.nodes}
        if len(ids) != len(self.nodes) or any(e.source not in ids or e.target not in ids for e in self.edges):
            raise ValueError("Diagram nodes and edges do not match")
        if self.kind in ("process", "architecture") and not self.nodes:
            raise ValueError("Diagram needs nodes")
        if self.kind == "chart" and (not self.data or not self.note):
            raise ValueError("Chart needs numeric data and a source note")
        return self

class DeckSpec(Spec):
    title: str = Field(max_length=120)
    subtitle: str = Field(default="", max_length=160)
    pages: list[Page] = Field(min_length=3, max_length=12)

def e(value):
    return escape(str(value), quote=True)

def svg_text(value, x, y, class_name, width, line_height):
    lines = []; current = ''; used = 0
    for char in value:
        cells = 2 if unicodedata.east_asian_width(char) in ('W', 'F') else 1
        if used + cells > width:
            lines.append(current); current = ''; used = 0
        current += char; used += cells
    if current: lines.append(current)
    return f'<text x="{x}" y="{y}" class="{class_name}">' + ''.join(f'<tspan x="{x}" dy="{0 if i==0 else line_height}">{e(line)}</tspan>' for i,line in enumerate(lines)) + '</text>'

def diagram(page, index):
    # Explicit endpoints; at most three columns, two rows. Connections are drawn under nodes.
    cols = min(3, len(page.nodes))
    positions = {n.id: (170 + (i % cols) * 430, 95 + (i // cols) * 200) for i, n in enumerate(page.nodes)}
    parts = [f'<svg viewBox="0 0 1240 430" role="img" aria-label="{e(page.title)}"><defs><marker id="arrow{index}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>']
    for edge in page.edges:
        x1, y1 = positions[edge.source]; x2, y2 = positions[edge.target]
        if edge.source == edge.target:
            d = f'M {x1+150} {y1-25} C {x1+205} {y1-100} {x1+205} {y1+100} {x1+150} {y1+25}'
            lx, ly = x1+180, y1
        elif y1 == y2:
            direction = 1 if x2 > x1 else -1
            sx, tx = x1 + direction * 150, x2 - direction * 150
            bend = -45 if direction == 1 else 45
            d = f'M {sx} {y1} Q {(sx+tx)/2} {y1+bend} {tx} {y2}'
            lx, ly = (sx + tx) / 2, y1 + (-32 if direction == 1 else 42)
        else:
            sx, tx = x1, x2
            direction = 1 if y2 > y1 else -1
            d = f'M {sx} {y1+direction*64} C {sx} {y1+direction*130} {tx} {y2-direction*130} {tx} {y2-direction*64}'
            lx, ly = (sx+tx)/2, (y1+y2)/2
        parts.append(f'<g data-source="{e(edge.source)}" data-target="{e(edge.target)}"><path d="{d}" fill="none" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow{index})"/><text x="{lx}" y="{ly}" class="edge-label">{e(edge.label)}</text></g>')
    for node in page.nodes:
        x, y = positions[node.id]
        parts.append(f'<g class="diagram-node" data-node="{e(node.id)}" role="button" tabindex="0" aria-pressed="false" aria-label="{e(node.label + ": " + node.detail)}"><rect x="{x-150}" y="{y-64}" width="300" height="128" rx="14" fill="var(--paper)" stroke="var(--accent)"/>{svg_text(node.label,x,y-26,"node-label",24,25)}{svg_text(node.detail,x,y+27,"node-detail",40,18)}</g>')
    return '<div class="diagram">' + ''.join(parts) + '</svg><p class="diagram-hint" aria-live="polite">选择节点查看关联路径；再次选择可恢复全图。</p></div>'

def render(deck: DeckSpec, theme: str, mode: str = "slides", editable: bool = True, deck_id=None) -> str:
    t = THEMES[theme]
    sections = []
    for i, p in enumerate(deck.pages):
        body = f'<p class="lede">{e(p.body)}</p>' if p.body else ''
        if p.kind in ("process", "architecture"):
            body += diagram(p, i)
            body += '<ol class="sr-only">' + ''.join(f'<li>{e(n.label)}: {e(n.detail)}</li>' for n in p.nodes) + '</ol>'
        elif p.kind == "chart":
            bound = max((abs(d.value) for d in p.data), default=1) or 1
            signed = any(d.value < 0 for d in p.data)
            body += '<div class="bars">' + ''.join(f'<div class="bar-row"><span>{e(d.label)}</span><div class="track {"signed" if signed else ""}"><div class="bar" style="width:{abs(d.value)/bound*(50 if signed else 100):.2f}%;left:{(50-abs(d.value)/bound*50 if d.value < 0 else 50) if signed else 0:.2f}%"></div></div><strong>{e(d.value):s} {e(p.unit)}</strong></div>' for d in p.data) + '</div>'
        if p.items:
            body += '<div class="items">' + ''.join(f'<article><b>{e(item.label)}</b><p>{e(item.text)}</p></article>' for item in p.items) + '</div>'
        sections.append(f'<section class="page {p.kind}" aria-label="第 {i+1} 页"><div class="eyebrow">{e(p.kicker or "KNOWLEDGE / VISUAL STORY")}</div><h1>{e(p.title)}</h1>{body}<footer><span>{e(p.note or deck.subtitle)}</span><span>{i+1:02d} / {len(deck.pages):02d}</span></footer></section>')
    css = '''*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI","Microsoft YaHei",sans-serif}.page{position:relative;width:min(1440px,100%);min-height:810px;margin:auto;padding:64px 76px 90px;background:var(--paper);overflow-wrap:anywhere;border-bottom:1px solid color-mix(in srgb,var(--ink) 15%,transparent)}.eyebrow{font-size:14px;letter-spacing:.15em;color:var(--accent);font-weight:700}h1{font-size:clamp(30px,4vw,60px);line-height:1.15;max-width:1120px;margin:28px 0 30px;font-family:var(--heading)}.cover{background:var(--bg);padding-top:110px}.cover h1{font-size:clamp(44px,6vw,88px);max-width:950px;letter-spacing:-.04em}.cover:before{content:"";position:absolute;right:0;top:0;width:20px;height:100%;background:var(--accent)}.lede{font-size:24px;line-height:1.7;max-width:1100px;color:var(--muted);white-space:pre-line}.items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;margin-top:40px}.items article{border-top:3px solid var(--accent);padding:24px 0}.items b{font-size:25px}.items p{font-size:20px;line-height:1.6;color:var(--muted);white-space:pre-line}.quote .lede{font-size:40px;line-height:1.5;border-left:6px solid var(--accent);padding-left:30px}footer{display:flex;justify-content:space-between;gap:32px;font-size:13px;color:var(--muted);margin-top:40px}.page>footer{position:absolute;bottom:28px;left:76px;right:76px}svg{display:block;width:100%;margin:35px 0}svg text{text-anchor:middle;fill:var(--ink);font-family:inherit}.node-label{font-size:23px;font-weight:700}.node-detail{font-size:14px;fill:var(--muted)}.edge-label{font-size:14px;paint-order:stroke;stroke:var(--paper);stroke-width:5px;stroke-linejoin:round}.bars{margin:50px 0}.bar-row{display:grid;grid-template-columns:190px 1fr 160px;gap:24px;align-items:center;margin:24px 0;font-size:20px}.track{background:color-mix(in srgb,var(--accent) 12%,transparent);height:30px}.bar{height:100%;background:var(--accent)}.toolbar{position:fixed;z-index:5;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:15px;background:#151820;color:#fff;padding:10px 16px;border-radius:100px;box-shadow:0 6px 30px #0003;font-size:14px}.toolbar button{background:transparent;border:1px solid #ffffff55;color:inherit;padding:7px 15px;border-radius:30px;cursor:pointer}.toolbar button:focus-visible{outline:3px solid #ffb184}.toolbar button:disabled{opacity:.3}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}body.slides .page{display:none}body.slides .page.active{display:block;min-height:100vh}body.explainer .page{min-height:0;padding-bottom:110px}body.explainer .toolbar{display:none}@media(max-width:700px){.page{padding:36px 24px 100px;min-height:100vh}.items{grid-template-columns:1fr;gap:16px}.lede{font-size:18px}.items p{font-size:17px}.page>footer{left:24px;right:24px;font-size:11px}.bar-row{grid-template-columns:85px 1fr 85px;gap:10px;font-size:13px}.quote .lede{font-size:26px}}@media print{body.slides .page{display:block;min-height:810px;break-after:page}.toolbar{display:none}}'''
    css += '''.track{position:relative}.bar{position:absolute}.track.signed:after{content:"";position:absolute;left:50%;top:-6px;bottom:-6px;border-left:1px solid var(--muted)}.noir-signal .cover:after{content:"";position:absolute;right:8%;top:13%;width:15%;height:65%;background:var(--accent);opacity:.9}.noir-signal .cover h1,.noir-signal .cover .lede{position:relative;z-index:1;max-width:73%}.noir-signal .comparison .items article:last-child{background:var(--accent);color:#151515;padding:28px}.noir-signal .comparison .items article:last-child p{color:#242424}.cobalt-editorial .cover{background:linear-gradient(90deg,var(--paper) 0%,var(--paper) 73%,var(--accent) 73%,var(--accent) 100%)}.cobalt-editorial .cover h1,.cobalt-editorial .cover .lede{max-width:69%}.cobalt-editorial .cover:before{display:none}.cobalt-editorial .comparison .items article:last-child{background:var(--accent);color:white;padding:28px}.cobalt-editorial .comparison .items article:last-child p{color:#e4eaff}.paper-narrative .eyebrow{border-top:1px solid var(--accent);padding-top:15px;max-width:220px}.paper-narrative .cover h1{font-weight:500}.paper-narrative .cover{border-left:12px solid var(--accent)}.paper-narrative .items article{border-top-width:1px}.page:not(.cover) h1{letter-spacing:-.025em}@media(max-width:700px){.noir-signal .cover:after{display:none}.noir-signal .cover h1,.noir-signal .cover .lede,.cobalt-editorial .cover h1,.cobalt-editorial .cover .lede{max-width:100%}.cobalt-editorial .cover{background:var(--paper);border-top:12px solid var(--accent)}}'''
    variables = ';'.join(f'--{key}:{t[key]}' for key in ('bg','paper','ink','muted','accent')) + f';--heading:{t["font"]}'
    js = '''const pages=[...document.querySelectorAll('.page')];let current=0;const prev=document.querySelector('#prev'),next=document.querySelector('#next'),counter=document.querySelector('#counter');function show(n){current=Math.max(0,Math.min(pages.length-1,n));pages.forEach((p,i)=>p.classList.toggle('active',i===current));prev.disabled=current===0;next.disabled=current===pages.length-1;counter.textContent=`${current+1} / ${pages.length}`;}prev.onclick=()=>show(current-1);next.onclick=()=>show(current+1);document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}});show(0);'''
    css += '.diagram-node{cursor:pointer}.diagram-node:focus{outline:none}.diagram-node:focus-visible rect,.diagram-node[aria-pressed=true] rect{stroke-width:4}.diagram-hint{font-size:14px;color:var(--muted);margin-top:-20px}'
    js += '''document.querySelectorAll('.diagram').forEach(figure=>{const nodes=[...figure.querySelectorAll('[data-node]')],edges=[...figure.querySelectorAll('[data-source]')],hint=figure.querySelector('.diagram-hint');let chosen=null;function select(node){chosen=chosen===node.dataset.node?null:node.dataset.node;nodes.forEach(n=>{n.setAttribute('aria-pressed',String(n.dataset.node===chosen));n.style.opacity=!chosen||n.dataset.node===chosen||edges.some(e=>(e.dataset.source===chosen&&e.dataset.target===n.dataset.node)||(e.dataset.target===chosen&&e.dataset.source===n.dataset.node))?'1':'.3'});edges.forEach(e=>e.style.opacity=!chosen||e.dataset.source===chosen||e.dataset.target===chosen?'1':'.15');hint.textContent=chosen?node.getAttribute('aria-label'):'选择节点查看关联路径；再次选择可恢复全图。'}nodes.forEach(node=>{node.addEventListener('click',()=>select(node));node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(node)}})})});'''
    html = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'"><title>{e(deck.title)}</title><style>:root{{{variables}}}{css}</style></head><body class="{e(mode)} {e(theme)}">{''.join(sections)}<nav class="toolbar" aria-label="幻灯片导航"><button id="prev" aria-label="上一页">←</button><span id="counter" aria-live="polite"></span><button id="next" aria-label="下一页">→</button></nav><script>{js}</script></body></html>'''
    if editable:
        from .editable import attach_editor
        return attach_editor(html, deck_id)
    return html
