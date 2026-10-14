const el = id => document.getElementById(id);
const send = data => window.ReactNativeWebView?.postMessage(JSON.stringify(data));
let field = null;
let source = '';
let activeBlock = 0;
function draw(id, latex, display = false) {
  const result = renderFormula(latex, display);
  if (result.ok) el(id).innerHTML = result.html;
  else el(id).textContent = latex ? `Формула не отображается: ${result.error}` : '—';
  return result.ok;
}
function drawChemical() {
  const block = chemicalBlocks(source)[activeBlock];
  const ok = block && draw('chemical-preview', `\\${block.command}{${el('argument').value}}`);
  el('chemical-apply').disabled = !ok || !el('argument').value.trim();
}
function refresh() {
  source = field?.value ?? el('source').value;
  el('source').value = source;
  const clean = stripPlaceholders(source).trim();
  draw('preview', clean, el('display').checked);
  const delimiter = el('display').checked ? '$$' : '$';
  const problems = checkFormulas([{ where: 'Формула', text: delimiter + clean + delimiter }]);
  el('problem').textContent = clean ? problems.map(item => item.message).join('; ') : '';
  el('save').disabled = !clean || hasBlockingProblem(problems);
  const blocks = chemicalBlocks(source);
  if (activeBlock >= blocks.length) activeBlock = 0;
  el('chemistry').hidden = blocks.length === 0;
  el('block').replaceChildren(...blocks.map((block, index) => {
    const option = document.createElement('option'); option.value = String(index); option.textContent = `${index + 1}. ${block.argument}`; return option;
  }));
  el('block').value = String(activeBlock);
  el('argument').value = blocks[activeBlock]?.argument ?? '';
  drawChemical();
}
function changeSource(next) { source = next; if (field) field.value = next; else el('source').value = next; refresh(); }
window.fxEditorInit = function (payload) {
  const vars = payload.theme ?? {};
  for (const [key, value] of Object.entries(vars)) document.documentElement.style.setProperty('--' + key, String(value));
  if (field) field.remove();
  const Mathfield = window.MathLive.MathfieldElement;
  Mathfield.fontsDirectory = null; Mathfield.soundsDirectory = null;
  field = new Mathfield(); field.mathVirtualKeyboardPolicy = 'manual';
  el('visual').replaceChildren(field);
  field.addEventListener('input', refresh);
  el('display').checked = !!payload.display;
  const groups = [...FORMULA_CATALOG.common, ...(FORMULA_CATALOG[payload.profile] ?? [])];
  el('palette').replaceChildren(...groups.map(group => {
    const section = document.createElement('section'); const title = document.createElement('h3'); title.textContent = group.title; section.append(title);
    for (const item of group.items) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label; button.title = item.label;
      button.onclick = () => { field.insert(item.insert, { focus: true }); refresh(); }; section.append(button);
    }
    return section;
  }));
  const subjectGroups = FORMULA_CATALOG[payload.profile] ?? [];
  window.mathVirtualKeyboard.layouts = ['numeric', 'symbols', 'alphabetic',
    ...(subjectGroups.length ? [{ label: payload.profile === 'CHEMISTRY' ? 'Химия' : 'Физика',
      rows: subjectGroups.flatMap(group => {
        const keys = group.items.map(item => ({ latex: item.latex, insert: item.insert, tooltip: item.label }));
        return [keys.slice(0, 5), keys.slice(5)].filter(row => row.length);
      }),
    }] : [])];
  activeBlock = 0; changeSource(payload.latex ?? '');
};
el('source').oninput = () => changeSource(el('source').value);
el('display').onchange = refresh;
el('keyboard').onclick = () => { field.focus(); window.mathVirtualKeyboard.show(); };
window.mathVirtualKeyboard.addEventListener('geometrychange', () => {
  document.documentElement.style.setProperty('--keyboard-height', `${window.mathVirtualKeyboard.boundingRect.height + 24}px`);
});
el('block').onchange = () => { activeBlock = Number(el('block').value); refresh(); };
el('argument').oninput = drawChemical;
el('species-build').onclick = () => { el('argument').value = speciesExpression(el('species').value, el('charge').value, el('mass').value, el('atomic').value); drawChemical(); };
el('reaction-build').onclick = () => { el('argument').value = reactionExpression(el('left').value, el('right').value, el('arrow').value, el('condition').value); drawChemical(); };
el('chemical-apply').onclick = () => changeSource(replaceChemicalBlock(source, activeBlock, el('argument').value));
el('chemical-cancel').onclick = refresh;
el('save').onclick = () => {
  refresh(); if (el('save').disabled) return;
  send({ save: { latex: stripPlaceholders(source).trim(), display: el('display').checked } });
};
send({ editorReady: true });
