import 'fake-indexeddb/auto';

// Permite inspecionar shadow roots fechados nos testes.
const attachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init: ShadowRootInit) {
  const root = attachShadow.call(this, init);
  (this as unknown as { __shadow: ShadowRoot }).__shadow = root;
  return root;
};
