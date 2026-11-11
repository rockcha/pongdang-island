import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PetJobsPanel, petJobCountdown } from '@/features/pets/pet-jobs-panel'
import { createPetPreview, petPreviewReducer } from '@/features/pets/pet-preview-model'
const now = Date.parse('2026-11-09T14:30:00Z')
afterEach(cleanup)
function show(at = now, working = false) {
  let state = createPetPreview(now)
  if (working) state = petPreviewReducer(state, { type: 'start-job', jobId:'sand-golem-clay', roll:0, now })
  const props={pets:state.pets,active:state.pets[0],now:at,busy:false,onStart:vi.fn(),onClaim:vi.fn(),onChoosePet:vi.fn(),onCare:vi.fn()}
  return {...render(<PetJobsPanel {...props}/>),props}
}
it('shows only two illustrated species jobs and updates rewards after enhancement',()=>{
  const {container,props,rerender}=show()
  expect(container.querySelectorAll('.pet-job-thumb svg')).toHaveLength(2)
  expect(screen.getAllByRole('button',{name:/보내기$/})).toHaveLength(2)
  fireEvent.click(screen.getByRole('button',{name:'도자기 공방 흙 고르기 보내기'}))
  expect(props.onStart).toHaveBeenCalledWith('sand-golem-clay')
  rerender(<PetJobsPanel {...props} active={{...props.active,level:5}}/>)
  expect(screen.getByText('391~483')).toBeTruthy()
  expect(screen.getByText('강화 보너스 +15%')).toBeTruthy()
  rerender(<PetJobsPanel {...props} active={props.pets.find(p=>p.speciesId==='poka-shark')!}/>)
  expect(screen.queryByText('도자기 공방 흙 고르기')).toBeNull()
  expect(screen.getByText('해변 안전 부표 순찰')).toBeTruthy()
})
it('updates countdown and progress without disabled send/claim clutter',()=>{
  const {container,props,rerender}=show(now,true)
  expect(screen.getByRole('timer').textContent).toBe('02:00:00')
  expect(screen.queryByRole('button',{name:/보내기$/})).toBeNull()
  expect(screen.queryByRole('button',{name:'보상 받기'})).toBeNull()
  expect(container.querySelectorAll('.pet-job-thumb')).toHaveLength(0)
  rerender(<PetJobsPanel {...props} now={now+3600000}/>)
  expect(screen.getByRole('timer').textContent).toBe('01:00:00')
  expect(screen.getByRole('progressbar',{name:'알바 진행률'}).getAttribute('value')).toBe('50')
})
it('shows the snapshotted reward at completion and claims the employed pet',()=>{
  const {props}=show(now+7200000,true)
  expect(screen.queryByRole('timer')).toBeNull()
  expect(screen.getByText('다녀왔어요!')).toBeTruthy()
  expect(screen.getByText('340')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'보상 받기'}))
  expect(props.onClaim).toHaveBeenCalledWith(props.active.id)
})
it('keeps legacy running jobs visible while hiding them from new options',()=>{
  const {props,rerender}=show()
  props.active.job={id:'lighthouse',startedAt:now,endsAt:now+10*3600000,reward:875}
  rerender(<PetJobsPanel {...props}/>)
  expect(screen.getByText('등대 야간 당직')).toBeTruthy()
  expect(screen.getByRole('timer').textContent).toBe('10:00:00')
  expect(screen.getByText(/내일.*복귀 예정/).textContent).toContain('오전 9:30')
  expect(petJobCountdown(now,now+1)).toBe('00:00:00')
  expect(petJobCountdown(now+1001,now)).toBe('00:00:02')
})
it('shows no unrelated jobs in an empty house',()=>{
  const {props,rerender}=show()
  rerender(<PetJobsPanel {...props} active={undefined}/>)
  expect(screen.queryByRole('button',{name:/보내기$/})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'펫 고르기'}))
  expect(props.onChoosePet).toHaveBeenCalledOnce()
})
