from pathlib import Path

base = Path(__file__).with_name('release_alpha536_patch.py')
source = base.read_text()
start = source.index("old_diag = ")
end = source.index("replace_once(diagnostics, old_diag, new_diag, 'credits org diagnostics')", start)
replacement = r'''old_diag = "      `Local runtime errors: ${Number(localRuntimeErrors.count || 0)} · persist ${Number(localRuntimeErrors.persistFailures || 0)} · render ${Number(localRuntimeErrors.renderFailures || 0)} · last ${localRuntimeErrors.lastAt ? `${localRuntimeErrors.lastStage || 'runtime'} · ${age(localRuntimeErrors.lastAt)} · ${localRuntimeErrors.lastMessage || 'error'}` : 'none'}`,\n"
new_diag = "      `Credits organization: selected ${state.data?.creditsOrganizationId || state.selectedCreditsOrgId || 'default'} · available ${Array.isArray(state.data?.organizations) ? state.data.organizations.filter(org=>String(org?.kind||'default')==='default'&&String(org?.status||'active')!=='deleted').length : 0} · fallbacks ${Number(state.creditsOrgFallbackCount || 0)}${state.creditsOrgLastFallbackFrom ? ` · last ${state.creditsOrgLastFallbackFrom} → ${state.creditsOrgLastFallbackTo || 'default'}` : ''}`,\n" + old_diag
'''
source = source[:start] + replacement + source[end:]
exec(compile(source, str(base), 'exec'), {'__name__': '__main__'})
