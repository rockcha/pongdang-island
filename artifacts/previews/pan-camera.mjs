// Use the same small-step buttons as players; the gauge has been removed.
export async function panCamera(page, value) {
  const left=page.getByRole('button',{name:'어항 왼쪽으로 조금 이동'})
  for(let n=0;n<15;n++)if(await left.isEnabled())await left.click()
  await page.waitForFunction(()=>+[...document.querySelectorAll('[data-view]')][0].dataset.view<.001)
  const steps=value>=2?14:Math.round(value/.15),target=Math.min(2,steps*.15)
  for(let n=0;n<steps;n++)await page.getByRole('button',{name:'어항 오른쪽으로 조금 이동'}).click()
  await page.waitForFunction(target=>Math.abs(+[...document.querySelectorAll('[data-view]')][0].dataset.view-target)<.001,target)
  return target
}
