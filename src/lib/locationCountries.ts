export const countryDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

const currentCountryCodes = `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
  BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
  CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
  DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
  GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
  HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
  KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY
  MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
  NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY
  QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
  TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ
  VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\s+/)

export const countryCodeByName = (() => {
  const codes = new Map<string, string>()
  if (!countryDisplayNames) return codes
  for (const code of currentCountryCodes) {
    const name = countryDisplayNames.of(code)
    if (name && name !== code) codes.set(name.trim().toLocaleLowerCase('en'), code)
  }
  codes.set('united states of america', 'US')
  return codes
})()

const usRegions = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '))
const canadianRegions = new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '))

/** Saved highlight labels use city + region for US/Canada, country name elsewhere. */
export function getHighlightLocationCountry(location: string) {
  const parts = location.split(',').map(part => part.trim()).filter(Boolean)
  const last = parts.at(-1) || ''
  const namedCountry = countryCodeByName.get(last.toLocaleLowerCase('en'))
  if (namedCountry) return namedCountry
  if (parts.length > 1) {
    if (usRegions.has(last.toUpperCase())) return 'US'
    if (canadianRegions.has(last.toUpperCase())) return 'CA'
  }
  // Missing/ambiguous labels must not be assigned a guessed flag.
  return ''
}
