
  const widgetWidth = (mobile = false, expanded = false) => mobile
    ? (expanded ? 'min(220px,calc(100vw - 16px))' : 'min(152px,calc(100vw - 16px))')
    : (state.widgetMode === 'detailed' ? 'clamp(196px,52vw,220px)' : 'clamp(166px,44vw,184px)');

  async function widgetMobileMode() {
    if (!rootBody) return false;
    try { return Number(await rootBody.clientWidth()) <= 600; } catch { return false; }
  }

  async function setResponsiveWidgetStyle(name, value) {
    if (!widget) return false;
    if (!widgetRenderCache.responsiveStyles || typeof widgetRenderCache.responsiveStyles !== 'object') {
      widgetRenderCache.responsiveStyles = Object.create(null);
    }
    if (widgetRenderCache.responsiveStyles[name] === value) {
      powerRuntime.responsiveStyleSkips += 1;
      performanceRuntime.widgetStyleSkips += 1;
      return false;
    }
    await widget.setStyle(name, value);
    widgetRenderCache.responsiveStyles[name] = value;
    powerRuntime.responsiveStyleWrites += 1;
    performanceRuntime.widgetStyleWrites += 1;
    return true;
  }

  async function applyWidgetResponsiveLayout(mobile, expanded) {
    if (!widget) return;
    const dockSide = ['left','right'].includes(String(state.widgetDockSide || '')) ? String(state.widgetDockSide) : '';
    const hasSavedY = num(state.widgetY);
    const hasSavedX = num(state.widgetX);
    const layout = mobile
      ? `${expanded ? 'mobile-expanded' : 'mobile-collapsed'}:${dockSide || (hasSavedX && hasSavedY ? 'free' : 'default')}`
      : 'desktop';
    if (widgetRenderCache.layout === layout) return;
    let desired;
    if (mobile && hasSavedY && dockSide === 'left') {
      desired = {
        left:'8px', top:`${state.widgetY}px`, right:'auto', bottom:'auto',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (mobile && hasSavedY && dockSide === 'right') {
      desired = {
        left:'auto', top:`${state.widgetY}px`, right:'8px', bottom:'auto',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (mobile && hasSavedX && hasSavedY) {
      desired = {
        left:`${state.widgetX}px`, top:`${state.widgetY}px`, right:'auto', bottom:'auto',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (mobile) {
      desired = {
        left:'auto', top:'auto', right:'8px', bottom:'88px',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (num(state.widgetX)&&num(state.widgetY)) {
      desired = {
        left:`${state.widgetX}px`, top:`${state.widgetY}px`, right:'auto', bottom:'auto',
        'border-radius':'11px', padding:'5px 10px 8px'
      };
    } else {
      desired = {
        left:'auto', top:'auto', right:'12px', bottom:'74px',
        'border-radius':'11px', padding:'5px 10px 8px'
      };
    }
    for (const [name, value] of Object.entries(desired)) {
      await setResponsiveWidgetStyle(name, value);
    }
    widgetRenderCache.layout = layout;
  }

  async function clampWidgetToViewport() {
    if (!widget || !rootBody || (!num(state.widgetX) && !num(state.widgetY))) return false;
    const rect = await widget.getBoundingClientRect();
    const bodyWidth = Number(await rootBody.clientWidth());
    const bodyHeight = Number(await rootBody.clientHeight());
    const maxX = Math.max(8, bodyWidth - Number(rect.width || 0) - 8);
    const maxY = Math.max(8, bodyHeight - Number(rect.height || 0) - 8);
    const nextY = Math.max(8, Math.min(maxY, num(state.widgetY) ? Number(state.widgetY) : Number(rect.top || 8)));
    const dockSide = ['left','right'].includes(String(state.widgetDockSide || '')) ? String(state.widgetDockSide) : '';
    state.widgetY = nextY;
    await widget.setStyle('top',`${nextY}px`);
    await widget.setStyle('bottom','auto');
    if (widgetMobileViewport && dockSide === 'right') {
      state.widgetX = maxX;
      await widget.setStyle('left','auto');
      await widget.setStyle('right','8px');
    } else {
      const nextX = widgetMobileViewport && dockSide === 'left'
        ? 8
        : Math.max(8, Math.min(maxX, num(state.widgetX) ? Number(state.widgetX) : Number(rect.left || 8)));
      state.widgetX = nextX;
      await widget.setStyle('left',`${nextX}px`);
      await widget.setStyle('right','auto');
    }
    if (widgetRenderCache.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object') {
      widgetRenderCache.responsiveStyles.top = `${state.widgetY}px`;
      widgetRenderCache.responsiveStyles.bottom = 'auto';
      widgetRenderCache.responsiveStyles.left = widgetMobileViewport && dockSide === 'right' ? 'auto' : `${state.widgetX}px`;
      widgetRenderCache.responsiveStyles.right = widgetMobileViewport && dockSide === 'right' ? '8px' : 'auto';
    }
    return true;
  }

  async function detachWidgetRemoteListeners() {
    const entries = widgetRemoteListeners.splice(0);
    if (!entries.length) return;
    const owned = new Set(entries);
    for (const [target,type,id] of entries) {
      try { await target.removeEventListener(type,id); } catch (_) {}
    }
    for (let index=remoteListeners.length-1; index>=0; index-=1) {
      if (owned.has(remoteListeners[index])) remoteListeners.splice(index,1);
    }
  }

  async function addWidgetRemoteListener(target,type,handler) {
    const entry=[target,type,await target.addEventListener(type,handler)];
    widgetRemoteListeners.push(entry);
    remoteListeners.push(entry);
    return entry;
  }

  async function recreateWidget() {
    if (runtimeDisposed) return false;
    await detachWidgetRemoteListeners();
    if (widget) {
      try { await widget.remove(); } catch (_) {}
    }
    widget=null;
    rootBody=null;
    drag=null;
    widgetMobileExpanded=false;
    widgetMobileViewport=false;
    widgetMobileToggleBlockedUntil=Date.now()+400;
    widgetRenderCache={html:null,width:null,display:null,layout:null,responsiveStyles:Object.create(null)};
    await renderWidget('widget-recreate');
    return !!widget;
  }
