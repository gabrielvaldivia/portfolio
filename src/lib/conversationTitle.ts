export function getConversationTitle(title: string) {
  return title.replace(/^Homepage\s*·\s*/i, '')
}
