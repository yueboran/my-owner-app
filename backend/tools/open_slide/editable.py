"""Adapt generated HTML to the vendored Frontend Slides Editable DOM contract."""
import hashlib
from pathlib import Path
import re

ASSETS = Path(__file__).parent / 'editor_runtime'
MARKER = 'data-editor-runtime="frontend-slides-editable"'

def attach_editor(html, deck_id=None):
    if MARKER in html:
        return html
    identity = deck_id or hashlib.sha256(html.encode()).hexdigest()[:24]
    html = html.replace('<html ', f'<html {MARKER} data-deck-id="{identity}" data-template-edit-mode="slots" data-mobile-adaptation="enabled" ', 1)
    start = html.index('<body')
    end = html.index('>', start)+1
    body = html[end:html.index('</body>')]
    # Replace the legacy player with the actual upstream editor/player.
    body = re.sub(r'<nav class="toolbar".*?</nav>', '', body, flags=re.S)
    body = re.sub(r'<script>.*?</script>', '', body, flags=re.S)
    slides = re.findall(r'<section class="page .*?</section>', body, re.S)
    if not slides: raise ValueError('No generated pages to edit')
    slot_index = 0
    def slot(match):
        nonlocal slot_index
        tag, attrs, content = match.groups()
        if 'diagram-hint' in attrs: return match.group()
        slot_index += 1
        return f'<{tag}{attrs} data-edit-slot="slot-{slot_index}" data-slot-type="text" data-slot-locked-layout="true">{content}</{tag}>'
    adapted = []
    for i, slide in enumerate(slides):
        slide = slide.replace('class="page ', 'class="slide page ', 1)
        slide = slide.replace('<section ', f'<section id="slide-{i}" ', 1)
        slide = re.sub(r'<(h1|p|b)([^>]*)>(.*?)</\1>', slot, slide, flags=re.S)
        slide = slide.replace('</section>', '<div class="slide-edit-layer" aria-hidden="true"></div></section>')
        adapted.append(slide)
    css = (ASSETS / 'upstream.css').read_text('utf8')
    css += '''
      :root{--deck-chrome-accent:var(--accent);--font-display:var(--heading);--text-primary:var(--ink)}
      #deck.slides-offset>section.slide{display:block!important;height:auto!important;min-height:100dvh;width:100%!important;overflow:visible!important;scroll-snap-align:start}
      #deck.slides-offset>section.slide h1{font-size:clamp(30px,4vw,60px)!important;line-height:1.15!important}
      #deck.slides-offset>section.cover h1{font-size:clamp(44px,6vw,88px)!important}
      .slides-offset>section.slide .items article{background:transparent}
      .deck-left-hover-anchor{z-index:10000}.deck-left-hover-anchor .deck-left-row>button{opacity:1!important;pointer-events:auto!important;transform:none!important}
      .deck-left-hover-anchor{max-width:95vw}.deck-left-row{flex-wrap:wrap}.slide-object-text{color:var(--ink)}
      .filmstrip-thumb-host .page{display:block!important;min-height:0!important}
      .deck-edit-chrome svg{margin:0}
      body.explainer{scroll-snap-type:none}body.explainer #deck.slides-offset>section.slide{min-height:0}
      @media print{#deck.slides-offset>section.slide{min-height:810px}.slide-edit-layer{display:block}}
    '''
    js = (ASSETS / 'upstream.js').read_text('utf8')
    # Delegation survives page cloning, undo and restored snapshots.
    js += '''
    document.addEventListener('click',event=>{
      const node=event.target.closest?.('#deck .diagram [data-node]');
      if(!node||document.body.classList.contains('deck-edit-mode'))return;
      const figure=node.closest('.diagram'),chosen=node.getAttribute('aria-pressed')==='true'?null:node.dataset.node;
      const edges=[...figure.querySelectorAll('[data-source]')];
      figure.querySelectorAll('[data-node]').forEach(n=>{n.setAttribute('aria-pressed',String(n.dataset.node===chosen));n.style.opacity=!chosen||n.dataset.node===chosen||edges.some(e=>(e.dataset.source===chosen&&e.dataset.target===n.dataset.node)||(e.dataset.target===chosen&&e.dataset.source===n.dataset.node))?'1':'.3'});
      edges.forEach(e=>e.style.opacity=!chosen||e.dataset.source===chosen||e.dataset.target===chosen?'1':'.15');
      figure.querySelector('.diagram-hint').textContent=chosen?node.getAttribute('aria-label'):'选择节点查看关联路径；再次选择可恢复全图。';
    });
    document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches?.('#deck .diagram [data-node]')){event.preventDefault();event.target.click()}});
    const root=document.querySelector('#deck');
    const repair=()=>{[...root.querySelectorAll(':scope>section.slide')].forEach((slide,i)=>{
      slide.querySelectorAll('marker').forEach((marker,j)=>{const id='figure-arrow-'+i+'-'+j,old=marker.id;if(old!==id){marker.id=id;slide.querySelectorAll('[marker-end]').forEach(p=>{if(p.getAttribute('marker-end')==='url(#'+old+')')p.setAttribute('marker-end','url(#'+id+')')})}});
      const footer=slide.querySelector('footer span:last-child');if(footer){const label=String(i+1).padStart(2,'0')+' / '+String(root.children.length).padStart(2,'0');if(footer.textContent!==label)footer.textContent=label}
    })};repair();new MutationObserver(repair).observe(root,{childList:true,subtree:true});
    '''
    head = html[:end].replace('</head>', '<style id="fse-runtime-style">'+css+'</style></head>')
    return head + (ASSETS / 'chrome.html').read_text('utf8') + '<main id="deck" class="slides-offset">'+''.join(adapted)+'</main><script>'+js+'</script></body></html>'
