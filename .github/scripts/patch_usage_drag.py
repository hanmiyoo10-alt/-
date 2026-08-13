from pathlib import Path
import re

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text(encoding='utf-8')

if '//@version 3.0.0-alpha.3.1' not in s:
    s = s.replace('//@version 3.0.0-alpha.3', '//@version 3.0.0-alpha.3.1', 1)
if "const VERSION = '3.0.0-alpha.3.1';" not in s:
    s = s.replace("const VERSION = '3.0.0-alpha.3';", "const VERSION = '3.0.0-alpha.3.1';", 1)

handle_old = '<div style="height:12px;background:linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/28px 3px no-repeat;cursor:grab"></div>'
handle_new = '<div data-drag-handle="1" style="height:12px;background:linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/28px 3px no-repeat;cursor:grab"></div>'
if handle_new not in s:
    s = s.replace(handle_old, handle_new, 1)

replacement = """    const down = async e => {
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r=await widget.getBoundingClientRect();
      const localY = Number(e.clientY) - r.top;
      if (localY < 0 || localY > 18) { drag = null; return; }
      drag={pointerId:e.pointerId ?? null,ox:Number(e.clientX)-r.left,oy:Number(e.clientY)-r.top,maxX:Math.max(8,(await rootBody.clientWidth())-r.width-8),maxY:Math.max(8,(await rootBody.clientHeight())-r.height-8)};
    };
    const move = async e => {
      if (!drag||!num(e.clientX)||!num(e.clientY)) return;
      if (drag.pointerId !== null && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      state.widgetX=Math.max(8,Math.min(drag.maxX,Number(e.clientX)-drag.ox)); state.widgetY=Math.max(8,Math.min(drag.maxY,Number(e.clientY)-drag.oy));
      await widget.setStyle('left',`${state.widgetX}px`); await widget.setStyle('top',`${state.widgetY}px`); await widget.setStyle('right','auto'); await widget.setStyle('bottom','auto');
    };
    const up = async e => {
      if (!drag) return;
      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      drag=null; await persist();
    };
"""

if 'const localY = Number(e.clientY) - r.top;' not in s:
    pattern = r"    const down = async e => \{.*?    const up = async \(\) => \{ if \(!drag\) return; drag=null; await persist\(\); \};\n"
    s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('drag block not found; latest.js unchanged')

if '//@version 3.0.0-alpha.3.1' not in s:
    raise SystemExit('version patch verification failed')
if 'const localY = Number(e.clientY) - r.top;' not in s:
    raise SystemExit('drag patch verification failed')

p.write_text(s, encoding='utf-8')
print('usage dashboard drag hotfix applied')
