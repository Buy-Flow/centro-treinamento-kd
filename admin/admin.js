(() => {
  const REPO = 'Buy-Flow/centro-treinamento-kd';
  const BRANCH = 'main';
  const CONFIG_PATH = 'site-config.json';
  const form = document.getElementById('config-form');
  const tokenInput = document.getElementById('github-token');
  const tokenStatus = document.getElementById('token-status');
  const publishButton = document.getElementById('publish');
  const publishTitle = document.getElementById('publish-title');
  const publishStatus = document.getElementById('publish-status');
  const preview = document.getElementById('preview');
  const toast = document.getElementById('toast');
  let config = null;

  const getToken = () => sessionStorage.getItem('kd_github_token') || '';
  const setToken = (value) => {
    if (value) sessionStorage.setItem('kd_github_token', value.trim());
    else sessionStorage.removeItem('kd_github_token');
  };

  function notify(message, error = false) {
    toast.textContent = message;
    toast.className = error ? 'show error' : 'show';
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.className = ''; }, 3600);
  }

  function getPath(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, key) => (acc[key] ??= {}), obj);
    target[last] = value;
  }

  function fillForm(data) {
    form.querySelectorAll('[name]').forEach((el) => {
      const value = getPath(data, el.name);
      if (value !== undefined && value !== null) el.value = value;
    });
  }

  function readForm() {
    const next = JSON.parse(JSON.stringify(config || {}));
    form.querySelectorAll('[name]').forEach((el) => setPath(next, el.name, el.value.trim()));
    return next;
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function textToBase64(text) {
    return bytesToBase64(new TextEncoder().encode(text));
  }

  async function github(path, options = {}) {
    const token = getToken();
    if (!token) throw new Error('Informe o token do GitHub para publicar.');
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Erro do GitHub (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function loadConfig() {
    try {
      const response = await fetch(`../site-config.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar a configuração.');
      config = await response.json();
      fillForm(config);
      publishTitle.textContent = 'Painel carregado';
      publishStatus.textContent = 'Você já pode editar e publicar.';
    } catch (error) {
      notify(error.message, true);
    }
  }

  function markDirty() {
    publishTitle.textContent = 'Alterações não publicadas';
    publishStatus.textContent = 'Toque em publicar para atualizar o site.';
  }

  async function saveConfig(nextConfig) {
    const file = await github(`/repos/${REPO}/contents/${CONFIG_PATH}?ref=${BRANCH}`);
    await github(`/repos/${REPO}/contents/${CONFIG_PATH}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Atualiza conteúdo pelo Painel KD',
        content: textToBase64(JSON.stringify(nextConfig, null, 2) + '\n'),
        sha: file.sha,
        branch: BRANCH
      })
    });
  }

  async function uploadImage(file, targetInput) {
    if (!file) return;
    if (!getToken()) throw new Error('Informe o token do GitHub antes de enviar imagens.');
    if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
    if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');

    const safeName = file.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._-]+/g, '-');
    const path = `assets/images/uploads/${Date.now()}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await github(`/repos/${REPO}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Envia imagem pelo Painel KD: ${safeName}`,
        content: bytesToBase64(bytes),
        branch: BRANCH
      })
    });
    targetInput.value = path;
    markDirty();
    notify('Imagem enviada. Agora publique as alterações.');
  }

  document.getElementById('save-token').addEventListener('click', async () => {
    setToken(tokenInput.value);
    if (!getToken()) {
      tokenStatus.textContent = 'Token removido.';
      return;
    }
    tokenStatus.textContent = 'Verificando…';
    try {
      await github(`/repos/${REPO}`);
      tokenStatus.textContent = 'Acesso conectado ✓';
      notify('Acesso conectado ao GitHub.');
    } catch (error) {
      tokenStatus.textContent = 'Falha no acesso';
      notify(error.message, true);
    }
  });

  if (getToken()) {
    tokenInput.value = getToken();
    tokenStatus.textContent = 'Token desta sessão carregado.';
  }

  form.addEventListener('input', (event) => {
    if (event.target.matches('[name]')) markDirty();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    publishButton.disabled = true;
    publishButton.textContent = 'PUBLICANDO…';
    publishTitle.textContent = 'Publicando';
    publishStatus.textContent = 'Salvando a nova configuração no GitHub.';
    try {
      const next = readForm();
      await saveConfig(next);
      config = next;
      publishTitle.textContent = 'Alterações publicadas ✓';
      publishStatus.textContent = 'O GitHub Pages atualizará o site automaticamente.';
      notify('Alterações publicadas com sucesso.');
      setTimeout(() => { preview.src = `../?admin-preview=${Date.now()}`; }, 2500);
    } catch (error) {
      publishTitle.textContent = 'Não foi possível publicar';
      publishStatus.textContent = error.message;
      notify(error.message, true);
    } finally {
      publishButton.disabled = false;
      publishButton.textContent = 'PUBLICAR ALTERAÇÕES';
    }
  });

  document.querySelectorAll('[data-upload-target]').forEach((input) => {
    input.addEventListener('change', async () => {
      const target = document.getElementById(input.dataset.uploadTarget);
      try {
        input.disabled = true;
        await uploadImage(input.files?.[0], target);
      } catch (error) {
        notify(error.message, true);
      } finally {
        input.disabled = false;
        input.value = '';
      }
    });
  });

  document.getElementById('refresh-preview').addEventListener('click', () => {
    preview.src = `../?admin-preview=${Date.now()}`;
  });

  loadConfig();
})();
