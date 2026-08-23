export function createDiagnosticDom({ execResult = true, execThrows = false } = {}) {
  const events = [];
  const previous = {
    isConnected: true,
    focus() { events.push('previous-focus'); },
  };
  let created = null;
  const body = {
    children: [],
    appendChild(node) {
      events.push('append');
      this.children.push(node);
      node.parentNode = this;
      return node;
    },
    removeChild(node) {
      events.push('remove');
      const i = this.children.indexOf(node);
      if (i >= 0) this.children.splice(i, 1);
      node.parentNode = null;
      return node;
    },
  };
  const document = {
    body,
    activeElement: previous,
    createElement(tag) {
      if (tag !== 'textarea') throw new Error(`unexpected element ${tag}`);
      events.push('create');
      created = {
        value: '',
        attrs: {},
        style: {},
        tabIndex: 0,
        parentNode: null,
        setAttribute(k, v) { this.attrs[k] = v; },
        focus() { events.push('textarea-focus'); },
        select() { events.push('select'); },
        setSelectionRange(a, b) { events.push(`range:${a}:${b}`); },
      };
      return created;
    },
    execCommand(name) {
      events.push(`exec:${name}`);
      if (execThrows) throw new Error('synthetic exec failure');
      return execResult;
    },
  };
  return { document, events, body, previous, get created() { return created; } };
}
