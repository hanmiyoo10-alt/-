
  async function ensureWidget() {
    if (widget) return;
    if (!(await Risuai.requestPluginPermission('mainDom'))) return;
    const root = await Risuai.getRootDocument();
    rootBody = await root.querySelector('body');
    widget = await root.createElement('div');
    const pos = num(state.widgetX)&&num(state.widgetY)?`left:${state.widgetX}px;top:${state.widgetY}px;`:'right:12px;bottom:74px;';
    await widget.setStyleAttribute(`position:fixed;${pos}width:${widgetWidth()};max-width:calc(100vw - 16px);z-index:2147483000;background:#191b20;color:#f5f7fa;border:1px solid rgba(255,255,255,.12);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.24);padding:5px 10px 8px;box-sizing:border-box;user-select:none;touch-action:manipulation;`);
    await rootBody.appendChild(widget);
    const down = async e => {
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r=await widget.getBoundingClientRect();
      const localX = Number(e.clientX) - r.left;
      const localY = Number(e.clientY) - r.top;
      const inHandle = widgetMobileViewport
        ? localX >= 0 && localX <= 38 && localY >= 0 && localY <= 42
        : localY >= 0 && localY <= 18;
      if (!inHandle) {
        drag = null;
        return;
      }
      drag={
        pointerId: e.pointerId ?? null,
        startX:Number(e.clientX),
        startY:Number(e.clientY),
        ox:Number(e.clientX)-r.left,
        oy:Number(e.clientY)-r.top,
        moved:false,
        maxX:Math.max(8,(await rootBody.clientWidth())-r.width-8),
        maxY:Math.max(8,(await rootBody.clientHeight())-r.height-8)
      };
    };
    const move = async e => {
      if (!drag||!num(e.clientX)||!num(e.clientY)) return;
      if (drag.pointerId !== null && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      const distance = Math.hypot(Number(e.clientX)-drag.startX, Number(e.clientY)-drag.startY);
      if (!drag.moved && distance < 6) return;
      drag.moved = true;
      state.widgetX=Math.max(8,Math.min(drag.maxX,Number(e.clientX)-drag.ox));
      state.widgetY=Math.max(8,Math.min(drag.maxY,Number(e.clientY)-drag.oy));
      await widget.setStyle('left',`${state.widgetX}px`);
      await widget.setStyle('top',`${state.widgetY}px`);
      await widget.setStyle('right','auto');
      await widget.setStyle('bottom','auto');
      if (widgetRenderCache.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object') {
        widgetRenderCache.responsiveStyles.left = `${state.widgetX}px`;
        widgetRenderCache.responsiveStyles.top = `${state.widgetY}px`;
        widgetRenderCache.responsiveStyles.right = 'auto';
        widgetRenderCache.responsiveStyles.bottom = 'auto';
      }
    };
    const up = async e => {
      if (!drag) return;
      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      const finished = drag;
      drag=null;
      if (!finished.moved) return;
      if (widgetMobileViewport) {
        const dockSide = Number(state.widgetX || 0) <= finished.maxX / 2 ? 'left' : 'right';
        state.widgetDockSide = dockSide;
        state.widgetX = dockSide === 'left' ? 8 : finished.maxX;
        if (dockSide === 'left') {
          await widget.setStyle('left','8px');
          await widget.setStyle('right','auto');
        } else {
          await widget.setStyle('left','auto');
          await widget.setStyle('right','8px');
        }
        widgetRenderCache.layout = null;
      } else {
        state.widgetDockSide = '';
      }
      widgetMobileToggleBlockedUntil=Date.now()+500;
      await persist();
    };
    const toggleMobileWidget = async e => {
      if (!widgetMobileViewport) return;
      if (Date.now() < widgetMobileToggleBlockedUntil) return;
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r = await widget.getBoundingClientRect();
      const localX = Number(e.clientX) - r.left;
      const localY = Number(e.clientY) - r.top;
      const toggleWidth = widgetMobileExpanded ? 40 : 34;
      const toggleHeight = widgetMobileExpanded ? 42 : Math.max(32, Number(r.height || 0));
      const inToggle = localX >= Number(r.width || 0) - toggleWidth && localY >= 0 && localY <= toggleHeight;
      if (!inToggle) return;
      widgetMobileExpanded = !widgetMobileExpanded;
      widgetRenderCache.layout = null;
      await renderWidget('mobile-widget-toggle');
    };
    await addWidgetRemoteListener(widget,'pointerdown',down);
    await addWidgetRemoteListener(widget,'click',toggleMobileWidget);
    await addWidgetRemoteListener(root,'pointermove',move);
    await addWidgetRemoteListener(root,'pointerup',up);
    await addWidgetRemoteListener(root,'pointercancel',up);
  }
