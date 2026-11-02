/** Practice-only growth; catalog values and the free-form test mode remain the baseline. */
export const practiceEnemyGrowth={normalHpPerBand:.2,normalAttackPerBand:1,intermediateHpPerBand:.2,intermediateAttackPerBand:1,magicPerBand:1,goldPerBand:.35}

export const finalBossBalance={hp:220,attack:22,defense:7,magicResistance:7,solarDamage:25,chainDamage:20}

// New growth runs opt into compensation; pre-growth saved runs keep their original rules.
export const statEnemyGrowth={hpPerPoint:.02,attackPerPoint:0,bossHpPerPoint:.02,bossAttackPerPoint:0}
