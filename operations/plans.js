const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function plansMarkup(plans, canWrite) {
  const rows = plans.map(plan => `<tr><td data-label="Plan"><strong>${escape(plan.displayName)}</strong><small>${escape(plan.planId)}</small></td>
    <td data-label="Stripe Price"><code>${escape(plan.stripePriceId)}</code></td><td data-label="Trial">${plan.trialDays} dias</td>
    <td data-label="Estado"><span class="badge ${plan.active ? 'active' : 'suspended'}">${plan.active ? 'Activo' : 'Inactivo'}</span></td>
    <td data-label="Acciones"><button class="secondary-button" data-plan="${escape(plan.planId)}">${canWrite ? 'Editar' : 'Ver'}</button></td></tr>`).join('');
  return `<section class="surface plan-registry"><header><div><h2>Planes KREATON</h2><p>Precios de suscripcion y periodos de prueba.</p></div>${canWrite ? '<button class="primary-button" data-new-plan>Nuevo plan</button>' : ''}</header>
    <div class="table-wrap"><table><thead><tr><th>Plan</th><th>Stripe Price</th><th>Trial</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${plans.length ? '' : '<p class="empty">No hay planes registrados.</p>'}<p class="plan-notice">Los cambios aplican a nuevas suscripciones. Las suscripciones existentes conservan su precio.</p></section>`;
}

export function mountPlans(root, { plans, canWrite, api, reload }) {
  root.innerHTML = plansMarkup(plans, canWrite);
  const open = plan => {
    const dialog = document.createElement('dialog');
    dialog.className = 'plan-dialog';
    const disabled = canWrite ? '' : 'disabled';
    dialog.innerHTML = `<form class="plan-form"><h2>${plan ? escape(plan.displayName) : 'Nuevo plan'}</h2>
      <label>Identificador<input name="planId" required pattern="[a-z0-9][a-z0-9_]*" maxlength="80" value="${escape(plan?.planId)}" ${plan ? 'readonly' : ''} ${disabled}></label>
      <label>Nombre visible<input name="displayName" required maxlength="120" value="${escape(plan?.displayName)}" ${disabled}></label>
      <label>Stripe Price de test<input name="stripePriceId" required pattern="price_[A-Za-z0-9]+" value="${escape(plan?.stripePriceId)}" ${plan ? 'readonly' : ''} ${disabled}></label>
      <p data-price-detail role="status"></p>
      <label>Dias de prueba<input name="trialDays" type="number" min="0" max="730" step="1" required value="${plan?.trialDays ?? 0}" ${disabled}></label>
      <label class="plan-check"><input name="active" type="checkbox" ${plan?.active !== false ? 'checked' : ''} ${disabled}> Activo para nuevas suscripciones</label>
      <p data-status role="status"></p><footer><button type="button" data-close class="secondary-button">Cerrar</button>${canWrite ? '<button class="primary-button" type="submit">Guardar</button>' : ''}</footer></form>
      ${plan && canWrite ? '<form class="plan-price-form"><h3>Nuevo precio</h3><label>Importe USD<input name="amount" type="number" min="0.01" step="0.01" max="999999.99" required></label><p>Se crea un nuevo Stripe Price con la misma periodicidad. No modifica suscripciones actuales.</p><button class="secondary-button" type="submit">Crear y asignar precio</button></form>' : ''}`;
    document.body.append(dialog); dialog.showModal();
    if (plan) {
      const detail = dialog.querySelector('[data-price-detail]'); detail.textContent = 'Consultando precio...';
      api(`/api/admin/plans/${encodeURIComponent(plan.planId)}/price`).then(price => {
        detail.textContent = `${new Intl.NumberFormat('es-US', {style:'currency', currency:price.currency}).format(price.amountCents / 100)} / ${price.intervalCount} ${price.interval} (test)`;
      }).catch(error => { detail.textContent = error.message; });
    }
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('[data-close]').onclick = close;
    dialog.addEventListener('close', () => dialog.remove());
    const save = async (form, path, method, body) => {
      const buttons = [...dialog.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
      const status = dialog.querySelector('[data-status]'); status.textContent = 'Guardando...';
      try { await api(path, {method, body: JSON.stringify(body)}); close(); await reload(); }
      catch(error) { status.textContent = error.message; }
      finally { buttons.forEach(b => b.disabled = false); }
    };
    dialog.querySelector('.plan-form').onsubmit = event => {
      event.preventDefault(); if (!canWrite) return;
      const form = event.currentTarget, fields = form.elements;
      const body = {displayName: fields.displayName.value.trim(), trialDays: Number(fields.trialDays.value), active: fields.active.checked};
      if (plan) body.version = plan.version;
      else Object.assign(body, {planId: fields.planId.value, stripePriceId: fields.stripePriceId.value});
      save(form, `/api/admin/plans${plan ? '/' + encodeURIComponent(plan.planId) : ''}`, plan ? 'PATCH' : 'POST', body);
    };
    dialog.querySelector('.plan-price-form')?.addEventListener('submit', event => {
      event.preventDefault();
      save(event.currentTarget, `/api/admin/plans/${encodeURIComponent(plan.planId)}/price`, 'POST', {
        version: plan.version, amountCents: Math.round(Number(event.currentTarget.elements.amount.value) * 100),
      });
    });
  };
  root.querySelector('[data-new-plan]')?.addEventListener('click', () => open(null));
  root.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => open(plans.find(plan => plan.planId === button.dataset.plan))));
}
