import { updateEstimatedDelivery } from './services/orders'

export function deliveryEstimateEditor(orderId: string, date: string | null | undefined, escapeHtml: (value: unknown) => string) {
  return '<div class="delivery-estimate-editor" data-estimate-order="' + escapeHtml(orderId) + '">' +
    '<label>Estimated delivery date<input class="delivery-estimate-input" type="date" max="9999-12-31" value="' + escapeHtml(date || '') + '"></label>' +
    '<div class="delivery-estimate-actions"><button type="button" class="secondary" data-estimate-save>Save date</button>' +
    '<button type="button" class="secondary" data-estimate-clear>Clear date</button></div>' +
    '<p class="delivery-estimate-message" role="status">' + (date ? 'This estimate is visible in the customer’s NEXUS account.' : 'No estimate set. Choose a date to show in NEXUS.') + '</p></div>'
}

export function bindDeliveryEstimateEditors() {
  document.querySelectorAll<HTMLElement>('.delivery-estimate-editor').forEach(editor => {
    const input = editor.querySelector<HTMLInputElement>('.delivery-estimate-input')!
    const message = editor.querySelector<HTMLElement>('.delivery-estimate-message')!
    const buttons = Array.from(editor.querySelectorAll<HTMLButtonElement>('button'))
    const save = async (clear: boolean) => {
      if (buttons.some(button => button.disabled)) return
      if (!clear && (!input.value || !input.reportValidity())) {
        message.textContent = 'Choose a valid date, or use Clear date to remove the estimate.'
        return
      }
      buttons.forEach(button => button.disabled = true)
      input.disabled = true
      message.textContent = clear ? 'Clearing estimate…' : 'Saving estimate…'
      try {
        const date = clear ? null : input.value
        const result = await updateEstimatedDelivery(editor.dataset.estimateOrder!, date)
        input.value = result.order.estimated_delivery_date || ''
        message.textContent = date ? 'Saved. This estimate is visible in the customer’s NEXUS account.' : 'Cleared. No estimated date is shown in NEXUS.'
      } catch (error) {
        message.textContent = error instanceof Error ? error.message : 'Could not save the estimate. Try again.'
      } finally {
        buttons.forEach(button => button.disabled = false)
        input.disabled = false
      }
    }
    editor.querySelector('[data-estimate-save]')!.addEventListener('click', () => void save(false))
    editor.querySelector('[data-estimate-clear]')!.addEventListener('click', () => void save(true))
  })
}
