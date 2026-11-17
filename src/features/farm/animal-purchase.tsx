import { farmDuration } from './farm-duration'
import { FarmGold } from './farm-gold'
import { useState } from 'react'
import { Clock3, Minus, Plus, PawPrint } from 'lucide-react'
import {
  farmAnimals,
  farmAnimalKinds,
  ANIMAL_PURCHASE_SECONDS,
  MAX_ANIMAL_PURCHASE_QUANTITY,
  ANIMAL_PRODUCTION_OUTPUT,
  type FarmAnimal,
} from './animal-catalog'
import { farmGoods, farmAnimalHousing, type FarmSimAction } from './farm-simulation'
import type { TopviewState } from './topview-model'
import { TopviewArt } from './topview-art'
import { FarmGoodIcon } from './farm-good-icon'

export function FarmAnimalPurchase({
  buildingId,
  kind,
  state,
  now,
  onAction,
}: {
  buildingId: number
  kind: 'barn' | 'coop'
  state: TopviewState
  now: number
  onAction: (action: FarmSimAction) => void
}) {
  const [selected, setSelected] = useState<FarmAnimal>(kind === 'barn' ? 'cow' : 'chicken')
  const [quantity, setQuantity] = useState(1)
  const job = state.simulation.animalPurchaseJobs[buildingId]
  if (job) {
    const animal = farmAnimals[job.animal],
      count = job.quantity ?? 1,
      remaining = Math.max(0, Math.ceil((job.readyAt - now) / 1000)),
      duration = job.readyAt - job.startedAt
    const progress =
      duration > 0 ? Math.max(0, Math.min(100, ((now - job.startedAt) / duration) * 100)) : 100
    return (
      <section className="farm-animal-purchase">
        <AnimalPurchaseSummary animal={job.animal} state={state} />
        <div className="farm-animal-purchase-content farm-sim-feature">
          <div className="farm-animal-preparing">
            <TopviewArt kind={job.animal} />
          </div>
          <h3>
            {remaining
              ? `${animal.name}${count > 1 ? ` ${count}마리` : ''} 준비 중`
              : '동물 준비 완료!'}
          </h3>
          <div
            className="farm-sim-progress"
            role="progressbar"
            aria-label="동물 준비 진행"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${progress}%` }} />
          </div>
          <p>
            {remaining
              ? `${remaining}초 후 ${count}마리를 함께 받을 수 있어요.`
              : `${count}마리를 보관함으로 받은 뒤 빈 땅에 배치해주세요.`}
          </p>
        </div>
        <footer className="farm-animal-purchase-footer">
          <button
            className="farm-sim-primary"
            disabled={remaining > 0}
            onClick={() => onAction({ type: 'completeAnimalPurchase' })}
          >
            {remaining
              ? '동물 준비 중…'
              : count > 1
                ? `${count}마리 보관함으로 받기`
                : '보관함으로 받기'}
          </button>
        </footer>
      </section>
    )
  }
  const animal = farmAnimals[selected],
    housing = farmAnimalHousing(state, selected),
    choices = farmAnimalKinds.filter((id) => farmAnimals[id].housing === kind)
  const maximum = Math.max(
    0,
    Math.min(
      MAX_ANIMAL_PURCHASE_QUANTITY,
      housing.capacity - housing.total,
      Math.floor(state.gold / animal.price),
    ),
  )
  const count = Math.max(1, Math.min(quantity, Math.max(1, maximum))),
    price = animal.price * count,
    seconds = ANIMAL_PURCHASE_SECONDS * count
  return (
    <section className="farm-animal-purchase">
      <div className="farm-animal-purchase-content">
        <AnimalPurchaseSummary animal={selected} state={state} />
        <div className="farm-animal-choices" role="group" aria-label="구매할 동물">
          {choices.map((id) => (
            <button
              key={id}
              aria-label={`${farmAnimals[id].name} 선택`}
              aria-pressed={id === selected}
              onClick={() => {
                setSelected(id)
                setQuantity(1)
              }}
            >
              <TopviewArt kind={id} />
              <strong>{farmAnimals[id].name}</strong>
              <span className="farm-animal-card-meta">
                <small className="farm-animal-price">
                  <FarmGold amount={farmAnimals[id].price.toLocaleString()} />
                </small>
                <small
                  className="farm-animal-time"
                  aria-label={`${farmAnimals[id].name} 1회 생산 시간 ${farmDuration(farmAnimals[id].seconds)}`}
                >
                  <Clock3 size={12} aria-hidden="true" />
                  생산 {farmDuration(farmAnimals[id].seconds)}
                </small>
              </span>
            </button>
          ))}
        </div>
        <section className="farm-animal-unlocks" aria-label="생산 가능한 상품">
          <strong>생산품</strong>
          <div className="farm-animal-products">
            <div>
              <FarmGoodIcon good={animal.product} />
              <div>
                <strong>{farmGoods[animal.product].name}</strong>
                <small>
                  먹이: 밀 1개 · 생산: {farmGoods[animal.product].name} {ANIMAL_PRODUCTION_OUTPUT}개
                </small>
                <small>생산 시간: {farmDuration(animal.seconds)}</small>
              </div>
            </div>
          </div>
          {animal.product === 'wool' && (
            <p className="farm-sim-caption">양털은 창고에 보관해요. 활용처는 준비 중이에요.</p>
          )}
        </section>
      </div>
      <footer className="farm-animal-purchase-footer">
        <div className="farm-animal-quantity">
          <label htmlFor={`farm-animal-quantity-${buildingId}`}>
            구매 수량 <small>최대 {maximum}마리</small>
          </label>
          <div className="farm-animal-quantity-stepper">
            <button
              type="button"
              aria-label="동물 구매 수량 줄이기"
              disabled={maximum === 0 || count <= 1}
              onClick={() => setQuantity(count - 1)}
            >
              <Minus size={14} />
            </button>
            <input
              id={`farm-animal-quantity-${buildingId}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(1, maximum)}
              value={count}
              disabled={maximum === 0}
              onChange={(event) => {
                const value = Number(event.target.value)
                setQuantity(
                  Number.isFinite(value)
                    ? Math.max(1, Math.min(Math.max(1, maximum), Math.floor(value)))
                    : 1,
                )
              }}
            />
            <button
              type="button"
              aria-label="동물 구매 수량 늘리기"
              disabled={count >= maximum}
              onClick={() => setQuantity(count + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <p>
          {maximum === 0
            ? housing.total >= housing.capacity
              ? '동물 정원이 가득 찼어요.'
              : '구매할 골드가 부족해요.'
            : `${count}마리 준비 ${seconds}초 · 완료 후 함께 수령`}
        </p>
        <button
          className="farm-sim-primary"
          disabled={maximum === 0}
          onClick={() =>
            onAction({
              type: 'animal',
              animal: selected,
              ...(count > 1 ? { quantity: count } : {}),
            })
          }
        >
          {animal.name}
          {count > 1 ? ` ${count}마리` : ''} 구매 · <FarmGold amount={price.toLocaleString()} />
        </button>
      </footer>
    </section>
  )
}

function AnimalPurchaseSummary({ animal, state }: { animal: FarmAnimal; state: TopviewState }) {
  const housing = farmAnimalHousing(state, animal),
    full = housing.total >= housing.capacity
  return (
    <div className="farm-animal-summary" role="group" aria-label="전체 동물 정원">
      <div
        data-full={full || undefined}
        aria-label={`사육 정원 ${housing.total} / ${housing.capacity}마리 · 보관·준비 중 포함`}
      >
        <span>
          <PawPrint size={14} />
          전체 동물 정원
        </span>
        <strong>
          {housing.total}
          <i> / </i>
          {housing.capacity}
          <small>마리</small>
        </strong>
      </div>
      <div className="farm-animal-capacity-action">
        <span>{full ? '정원이 가득 찼어요' : '모든 동물이 함께 쓰는 정원이에요'}</span>
      </div>
    </div>
  )
}
