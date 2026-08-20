export type TimelineWorldContext = {
  href: string
  summary: string
}

type LocationContext = Record<string, Record<number, TimelineWorldContext>>

export const LOCATION_CONTEXT: LocationContext = {
  Cuba: {
    1987: { href: 'https://en.wikipedia.org/wiki/Battle_of_Cuito_Cuanavale', summary: 'Cuban forces were deeply involved in the fighting around Cuito Cuanavale in Angola.' },
    1988: { href: 'https://en.wikipedia.org/wiki/Tripartite_Accord_(1988)', summary: 'Cuba signed the New York Accords, setting a timetable to withdraw its troops from Angola.' },
    1989: { href: 'https://en.wikipedia.org/wiki/Arnaldo_Ochoa', summary: 'Cuba executed decorated general Arnaldo Ochoa after a nationally watched drug-smuggling trial.' },
    1990: { href: 'https://en.wikipedia.org/wiki/Special_Period', summary: 'Cuba entered the Special Period as Soviet trade and economic support began to collapse.' },
    1991: { href: 'https://en.wikipedia.org/wiki/Dissolution_of_the_Soviet_Union', summary: 'The Soviet Union dissolved, deepening Cuba’s economic crisis as its final troops returned from Angola.' },
    1992: { href: 'https://en.wikipedia.org/wiki/Cuban_Democracy_Act', summary: 'The Cuban Democracy Act tightened the United States embargo during the Special Period.' },
    1993: { href: 'https://en.wikipedia.org/wiki/Special_Period', summary: 'Cuba legalized possession of United States dollars as part of its response to the economic crisis.' },
    1994: { href: 'https://en.wikipedia.org/wiki/1994_Cuban_rafter_crisis', summary: 'The Maleconazo protests and the rafter crisis made Cuba’s hardship visible to the world.' },
  },
  'Costa Rica': {
    1995: { href: 'https://en.wikipedia.org/wiki/World_Trade_Organization', summary: 'Costa Rica became a founding member of the World Trade Organization.' },
    1996: { href: 'https://en.wikipedia.org/wiki/Deforestation_in_Costa_Rica', summary: 'Costa Rica’s new Forestry Law created its pioneering program for paying landowners to protect forests.' },
    1997: { href: 'https://en.wikipedia.org/wiki/Economy_of_Costa_Rica', summary: 'Intel opened operations in Costa Rica, accelerating the country’s shift toward a technology economy.' },
    1998: { href: 'https://en.wikipedia.org/wiki/1998_Costa_Rican_general_election', summary: 'Costa Rica elected Miguel Ángel Rodríguez president as its two-party era began to fracture.' },
    1999: { href: 'https://en.wikipedia.org/wiki/1999_UNCAF_Nations_Cup', summary: 'San José hosted the UNCAF Nations Cup, with Costa Rica winning the regional football title at home.' },
    2000: { href: 'https://en.wikipedia.org/wiki/2000_Costa_Rican_protests', summary: 'Mass “Combo ICE” protests filled streets across Costa Rica and stopped a plan to open state utilities.' },
    2001: { href: 'https://en.wikipedia.org/wiki/Canada%E2%80%93Costa_Rica_Free_Trade_Agreement', summary: 'Costa Rica signed a free-trade agreement with Canada, its first with a developed country.' },
    2002: { href: 'https://en.wikipedia.org/wiki/2002_Costa_Rican_general_election', summary: 'Costa Rica held the first presidential runoff of its modern democratic era.' },
  },
  Tampa: {
    2003: { href: 'https://en.wikipedia.org/wiki/Super_Bowl_XXXVII', summary: 'The Tampa Bay Buccaneers won their first Super Bowl, bringing the region its first major sports title.' },
    2004: { href: 'https://en.wikipedia.org/wiki/2004_Stanley_Cup_Final', summary: 'The Tampa Bay Lightning won their first Stanley Cup.' },
    2005: { href: 'https://en.wikipedia.org/wiki/Hurricane_Wilma', summary: 'Hurricane Wilma crossed Florida, causing widespread damage and leaving millions without power.' },
    2006: { href: 'https://en.wikipedia.org/wiki/2006_Florida_gubernatorial_election', summary: 'Floridians elected Charlie Crist governor as the state’s insurance crisis dominated local politics.' },
    2007: { href: 'https://en.wikipedia.org/wiki/Tampa_Bay_Rays', summary: 'Tampa Bay’s baseball team announced it would drop “Devil” and become the Rays.' },
    2008: { href: 'https://en.wikipedia.org/wiki/2008_World_Series', summary: 'The Tampa Bay Rays went from last place to their first World Series.' },
    2009: { href: 'https://en.wikipedia.org/wiki/Super_Bowl_XLIII', summary: 'Tampa hosted Super Bowl XLIII at Raymond James Stadium.' },
    2010: { href: 'https://en.wikipedia.org/wiki/Deepwater_Horizon_oil_spill', summary: 'The Deepwater Horizon spill spread across the Gulf, disrupting Florida’s coast and tourism economy.' },
    2011: { href: 'https://en.wikipedia.org/wiki/STS-135', summary: 'Space shuttle Atlantis returned to Florida, ending NASA’s 30-year Space Shuttle program.' },
  },
  'Los Angeles': {
    2012: { href: 'https://en.wikipedia.org/wiki/Space_Shuttle_Endeavour', summary: 'Space shuttle Endeavour traveled through Los Angeles streets to its new home at the California Science Center.' },
  },
  'San Francisco': {
    2013: { href: 'https://en.wikipedia.org/wiki/Eastern_span_replacement_of_the_San_Francisco%E2%80%93Oakland_Bay_Bridge', summary: 'The new eastern span of the San Francisco–Oakland Bay Bridge opened after more than a decade of construction.' },
    2014: { href: 'https://en.wikipedia.org/wiki/2014_World_Series', summary: 'The San Francisco Giants won their third World Series in five seasons.' },
    2016: { href: 'https://en.wikipedia.org/wiki/Super_Bowl_50', summary: 'The San Francisco Bay Area hosted Super Bowl 50, with major festivities centered along the Embarcadero.' },
    2017: { href: 'https://en.wikipedia.org/wiki/Salesforce_Tower', summary: 'Salesforce Tower topped out and permanently changed the San Francisco skyline.' },
  },
  'London, England': {
    2015: { href: 'https://en.wikipedia.org/wiki/2015_United_Kingdom_general_election', summary: 'London returned David Cameron’s Conservatives to government with a surprise parliamentary majority.' },
  },
  'New York City': {
    2018: { href: 'https://en.wikipedia.org/wiki/Amazon_HQ2', summary: 'Amazon selected Long Island City for a major new campus, setting off a fierce New York debate.' },
    2019: { href: 'https://en.wikipedia.org/wiki/Climate_Leadership_and_Community_Protection_Act', summary: 'New York enacted a landmark climate law targeting net-zero statewide emissions by 2050.' },
    2020: { href: 'https://en.wikipedia.org/wiki/COVID-19_pandemic_in_New_York_City', summary: 'New York City became an early center of the COVID-19 pandemic in the United States.' },
    2021: { href: 'https://en.wikipedia.org/wiki/Impact_of_the_COVID-19_pandemic_on_the_performing_arts', summary: 'Broadway theaters reopened after an unprecedented 18-month shutdown.' },
    2022: { href: 'https://en.wikipedia.org/wiki/Eric_Adams', summary: 'Eric Adams was sworn in as New York City’s 110th mayor.' },
    2023: { href: 'https://en.wikipedia.org/wiki/2023_Canadian_wildfires', summary: 'Smoke from Canadian wildfires turned New York’s sky orange and pushed air quality to hazardous levels.' },
    2024: { href: 'https://en.wikipedia.org/wiki/2024_New_Jersey_earthquake', summary: 'A magnitude 4.8 earthquake in New Jersey rattled New York City and much of the Northeast.' },
    2025: { href: 'https://en.wikipedia.org/wiki/Congestion_pricing_in_New_York_City', summary: 'New York launched congestion pricing for vehicles entering Manhattan below 60th Street.' },
    2026: { href: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_final', summary: 'The New York–New Jersey region hosted the first 48-team FIFA World Cup final.' },
  },
}
