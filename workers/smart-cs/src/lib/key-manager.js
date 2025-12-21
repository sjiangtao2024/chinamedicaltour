function parseKeys(env) {
  return (env.LONGCAT_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function ensureState(keysSignature) {
  if (!globalThis.__smartcsKeyState || globalThis.__smartcsKeyState.signature !== keysSignature) {
    globalThis.__smartcsKeyState = {
      signature: keysSignature,
      rrIndex: 0,
      cooldownUntilBySlot: new Map(),
    };
  }
  return globalThis.__smartcsKeyState;
}

export function createKeyManager({ env, cooldownMs }) {
  const keys = parseKeys(env);
  const signature = `${keys.length}:${(env.LONGCAT_API_KEYS || "").length}`;
  const state = ensureState(signature);

  function now() {
    return Date.now();
  }

  function isActive(slot) {
    const until = state.cooldownUntilBySlot.get(slot) || 0;
    return until <= now();
  }

  return {
    keys,
    selectKeySlot() {
      if (keys.length === 0) return null;
      const start = state.rrIndex % keys.length;
      for (let i = 0; i < keys.length; i++) {
        const slot = (start + i) % keys.length;
        if (isActive(slot)) {
          state.rrIndex = (slot + 1) % keys.length;
          return { key_slot: slot, key: keys[slot] };
        }
      }
      return null;
    },
    markCooldown(slot) {
      state.cooldownUntilBySlot.set(slot, now() + cooldownMs);
    },
  };
}

