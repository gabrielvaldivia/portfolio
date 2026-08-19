export type TimelineWorldContext = {
  summary: string
}

type LocationContext = Record<string, Record<number, TimelineWorldContext>>

export const LOCATION_CONTEXT: LocationContext = {
  Cuba: {
    1987: { summary: 'Cuban forces were deeply involved in the fighting around Cuito Cuanavale in Angola.' },
    1988: { summary: 'Cuba signed the New York Accords, setting a timetable to withdraw its troops from Angola.' },
    1989: { summary: 'Cuba executed decorated general Arnaldo Ochoa after a nationally watched drug-smuggling trial.' },
    1990: { summary: 'Cuba entered the Special Period as Soviet trade and economic support began to collapse.' },
    1991: { summary: 'The Soviet Union dissolved, deepening Cuba’s economic crisis as its final troops returned from Angola.' },
    1992: { summary: 'The Cuban Democracy Act tightened the United States embargo during the Special Period.' },
    1993: { summary: 'Cuba legalized possession of United States dollars as part of its response to the economic crisis.' },
    1994: { summary: 'The Maleconazo protests and the rafter crisis made Cuba’s hardship visible to the world.' },
  },
  'Costa Rica': {
    1995: { summary: 'Costa Rica became a founding member of the World Trade Organization.' },
    1996: { summary: 'Costa Rica’s new Forestry Law created its pioneering program for paying landowners to protect forests.' },
    1997: { summary: 'Intel opened operations in Costa Rica, accelerating the country’s shift toward a technology economy.' },
    1998: { summary: 'Costa Rica elected Miguel Ángel Rodríguez president as its two-party era began to fracture.' },
    1999: { summary: 'San José hosted the UNCAF Nations Cup, with Costa Rica winning the regional football title at home.' },
    2000: { summary: 'Mass “Combo ICE” protests filled streets across Costa Rica and stopped a plan to open state utilities.' },
    2001: { summary: 'Costa Rica signed a free-trade agreement with Canada, its first with a developed country.' },
    2002: { summary: 'Costa Rica held the first presidential runoff of its modern democratic era.' },
  },
  Tampa: {
    2003: { summary: 'The Tampa Bay Buccaneers won their first Super Bowl, bringing the region its first major sports title.' },
    2004: { summary: 'The Tampa Bay Lightning won their first Stanley Cup.' },
    2005: { summary: 'Hurricane Wilma crossed Florida, causing widespread damage and leaving millions without power.' },
    2006: { summary: 'Floridians elected Charlie Crist governor as the state’s insurance crisis dominated local politics.' },
    2007: { summary: 'Tampa Bay’s baseball team announced it would drop “Devil” and become the Rays.' },
    2008: { summary: 'The Tampa Bay Rays went from last place to their first World Series.' },
    2009: { summary: 'Tampa hosted Super Bowl XLIII at Raymond James Stadium.' },
    2010: { summary: 'The Deepwater Horizon spill spread across the Gulf, disrupting Florida’s coast and tourism economy.' },
    2011: { summary: 'Space shuttle Atlantis returned to Florida, ending NASA’s 30-year Space Shuttle program.' },
  },
  'Los Angeles': {
    2012: { summary: 'Space shuttle Endeavour traveled through Los Angeles streets to its new home at the California Science Center.' },
  },
  'San Francisco': {
    2013: { summary: 'The new eastern span of the San Francisco–Oakland Bay Bridge opened after more than a decade of construction.' },
    2014: { summary: 'The San Francisco Giants won their third World Series in five seasons.' },
    2016: { summary: 'The San Francisco Bay Area hosted Super Bowl 50, with major festivities centered along the Embarcadero.' },
    2017: { summary: 'Salesforce Tower topped out and permanently changed the San Francisco skyline.' },
  },
  'London, England': {
    2015: { summary: 'London returned David Cameron’s Conservatives to government with a surprise parliamentary majority.' },
  },
  'New York City': {
    2018: { summary: 'Amazon selected Long Island City for a major new campus, setting off a fierce New York debate.' },
    2019: { summary: 'New York enacted a landmark climate law targeting net-zero statewide emissions by 2050.' },
    2020: { summary: 'New York City became an early center of the COVID-19 pandemic in the United States.' },
    2021: { summary: 'Broadway theaters reopened after an unprecedented 18-month shutdown.' },
    2022: { summary: 'Eric Adams was sworn in as New York City’s 110th mayor.' },
    2023: { summary: 'Smoke from Canadian wildfires turned New York’s sky orange and pushed air quality to hazardous levels.' },
    2024: { summary: 'A magnitude 4.8 earthquake in New Jersey rattled New York City and much of the Northeast.' },
    2025: { summary: 'New York launched congestion pricing for vehicles entering Manhattan below 60th Street.' },
    2026: { summary: 'The New York–New Jersey region hosted the first 48-team FIFA World Cup final.' },
  },
}
