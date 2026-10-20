/** DOM dialogs can leave canvas keyboard listeners alive underneath them. */
export function gameIsCovered(host: HTMLElement) {
  const owner = host.closest('dialog')
  if (owner?.dataset.gameActive === 'false') return true
  return Array.from(
    document.querySelectorAll<HTMLElement>('dialog[open],[role="dialog"],[role="alertdialog"]'),
  ).some((dialog) => {
    if (dialog === owner || dialog.contains(host)) return false
    for (let node: HTMLElement | null = dialog; node; node = node.parentElement) {
      if (
        node.hidden ||
        node.getAttribute('aria-hidden') === 'true' ||
        node.hasAttribute('data-closed')
      )
        return false
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
    return true
  })
}
