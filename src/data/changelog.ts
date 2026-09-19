import summaries from './changelog-entries.json'
import history from './changelog-history.json'

// Summaries are written alongside changes. Commit details are imported after
// those changes are committed; a new entry can therefore have no commits yet.
export const changelogEntries = summaries.map((entry) => ({
  ...entry,
  commits: history.commits.filter((commit) => commit.date === entry.date),
}))

export const changelogMonths = [...new Set(changelogEntries.map((entry) => entry.date.slice(0, 7)))]
